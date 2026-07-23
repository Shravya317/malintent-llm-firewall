import requests
import json

url = "https://malintent-backend-638595612528.asia-south1.run.app/api/v1/stats"
response = requests.get(url)
print(f"Status: {response.status_code}")
print(f"Body: {response.text}")
