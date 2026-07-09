"""
authentication.py — Authentication middleware and routing using Supabase JWT and Postgres User Table.
"""

import os
import logging
import jwt
import smtplib
from email.message import EmailMessage
import random
import datetime
from fastapi import HTTPException, Security, APIRouter, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
from models import User, OTPVerification

logger = logging.getLogger("malintent.auth")
router = APIRouter()

security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Pydantic Models ---


class RegistrationRequest(BaseModel):
    first_name: str
    middle_name: str = ""
    last_name: str
    dob: str
    sex: str
    country: str
    state: str
    email: EmailStr
    phone: str
    password: str


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str


class MessageResponse(BaseModel):
    message: str


# --- Helper Functions ---


def get_password_hash(password):
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def send_email_otp(recipient: str, otp: str):
    """Sends the OTP via SMTP using configured .env credentials."""
    smtp_email = os.environ.get("SMTP_EMAIL")
    smtp_password = os.environ.get("SMTP_PASSWORD")

    if not smtp_email or not smtp_password:
        logger.error("SMTP credentials missing. Simulating OTP.")
        print(f"[DEV MODE] Email OTP for {recipient} is: {otp}")
        return

    msg = EmailMessage()
    msg.set_content(
        f"Welcome to MalIntent Firewall!\n\nYour OTP for registration is: {otp}\n\nThis code will expire in 5 minutes."
    )
    msg["Subject"] = "MalIntent Security - Verify Your Email"
    msg["From"] = smtp_email
    msg["To"] = recipient

    try:
        # BUG FIX #4: Use context manager so connection always closes, even on error
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.send_message(msg)
        logger.info(f"OTP successfully sent to {recipient}")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        print(f"[DEV MODE fallback] Email OTP for {recipient} is: {otp}")


def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Verifies the JWT token from the Authorization header."""
    token = credentials.credentials
    secret = os.environ.get("SUPABASE_JWT_SECRET")

    if not secret:
        raise HTTPException(
            status_code=500, detail="Server authentication misconfigured."
        )

    try:
        payload = jwt.decode(
            token, secret, algorithms=["HS256"], options={"verify_aud": False}
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")


# --- Endpoints ---


@router.post("/register", response_model=MessageResponse)
async def register(request: RegistrationRequest, db: Session = Depends(get_db)):
    """Registers a new user (inactive) and sends an OTP to their email."""
    # Check if user exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new inactive user
    new_user = User(
        first_name=request.first_name,
        middle_name=request.middle_name,
        last_name=request.last_name,
        dob=request.dob,
        sex=request.sex,
        country=request.country,
        state=request.state,
        email=request.email,
        phone=request.phone,
        hashed_password=get_password_hash(request.password),
        is_active=False,
    )
    db.add(new_user)

    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))

    # BUG FIX #1: Use timezone-aware UTC datetime consistently to avoid naive/aware mismatch
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=5)

    otp_entry = OTPVerification(
        email=request.email, otp_code=otp_code, expires_at=expires_at
    )
    db.add(otp_entry)

    # Commit changes
    db.commit()

    # Dispatch email
    send_email_otp(request.email, otp_code)

    return MessageResponse(
        message="Registration successful. Please check your email for the OTP."
    )


@router.post("/verify-otp", response_model=LoginResponse)
async def verify_otp(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    """Verifies OTP and activates the user account, returning a JWT."""
    otp_entry = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == request.email,
            OTPVerification.otp_code == request.otp_code,
        )
        .order_by(OTPVerification.id.desc())
        .first()
    )

    if not otp_entry:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # BUG FIX #1: Compare naive UTC datetimes consistently (matches how expires_at is stored)
    if datetime.datetime.now(datetime.timezone.utc) > otp_entry.expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired")

    # Activate user
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True

    # BUG FIX #3: Delete OTP after use to prevent replay attacks and DB confusion
    db.delete(otp_entry)

    db.commit()

    # BUG FIX #2: Raise explicitly if JWT secret is missing — no silent fallback
    secret = os.environ.get("SUPABASE_JWT_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="JWT secret not configured.")

    payload = {
        "sub": user.email,
        "role": "customer",
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24),
    }
    token = jwt.encode(payload, secret, algorithm="HS256")

    return LoginResponse(access_token=token, token_type="bearer")


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates the user and returns a JWT token."""
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(
            status_code=403, detail="Account not verified. Please verify your OTP."
        )

    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # BUG FIX #2: Raise explicitly if JWT secret is missing — no silent fallback
    secret = os.environ.get("SUPABASE_JWT_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="JWT secret not configured.")

    payload = {
        "sub": user.email,
        "role": "customer",
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24),
    }

    token = jwt.encode(payload, secret, algorithm="HS256")

    return LoginResponse(access_token=token, token_type="bearer")