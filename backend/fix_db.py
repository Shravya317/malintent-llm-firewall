import os
from dotenv import load_dotenv

# Load .env so DATABASE_URL is available
load_dotenv('.env')

from database import SessionLocal
from models import ThreatLog

def fix_database():
    session = SessionLocal()
    
    logs = session.query(ThreatLog).all()
    count = 0
    
    for log in logs:
        # Determine correct decision
        correct_decision = "ALLOW"
        if log.risk_score >= 70:
            correct_decision = "BLOCK"
        elif log.risk_score >= 25:
            correct_decision = "FLAG"
            
        if log.decision != correct_decision:
            print(f"Fixing log {log.id}: risk_score={log.risk_score} was {log.decision}, changing to {correct_decision}")
            log.decision = correct_decision
            count += 1
            
    if count > 0:
        session.commit()
        print(f"Successfully fixed {count} threat logs.")
    else:
        print("No incorrectly classified threat logs found.")
        
    session.close()

if __name__ == "__main__":
    fix_database()
