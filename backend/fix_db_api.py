import requests

BASE_URL = 'https://malintent-backend-261681342014.asia-south1.run.app/api/v1'

def fix_database_via_api():
    print(f"Fetching logs from {BASE_URL}/logs...")
    # Fetch top 200 logs
    resp = requests.get(f"{BASE_URL}/logs?limit=200")
    if resp.status_code != 200:
        print(f"Failed to fetch logs: {resp.text}")
        return
        
    logs = resp.json()
    count = 0
    
    for log in logs:
        risk_score = log.get('risk_score', 0)
        current_decision = log.get('decision')
        log_id = log.get('id')
        
        # Determine correct decision
        correct_decision = "ALLOW"
        if risk_score >= 70:
            correct_decision = "BLOCK"
        elif risk_score >= 25:
            correct_decision = "FLAG"
            
        if current_decision != correct_decision:
            # The ID comes formatted as THR-0001, we need to extract the integer if so
            raw_id = log_id
            if isinstance(raw_id, str) and raw_id.startswith("THR-"):
                raw_id = int(raw_id.replace("THR-", ""))
            
            print(f"Fixing log {raw_id}: risk_score={risk_score} was {current_decision}, changing to {correct_decision}")
            
            put_resp = requests.put(
                f"{BASE_URL}/logs/{raw_id}/decision",
                json={"human_decision": correct_decision}
            )
            if put_resp.status_code == 200:
                count += 1
            else:
                print(f"Failed to update log {raw_id}: {put_resp.text}")
                
    print(f"Successfully fixed {count} threat logs via API.")

if __name__ == "__main__":
    fix_database_via_api()
