import requests

url = "https://malintent-backend-638595612528.asia-south1.run.app/api/v1/auth/verify-otp"
payload = {
    "email": "shravyasharma2006@gmail.com",
    "otp_code": "402960"
}
try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Network Error: {e}")
