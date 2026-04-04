import re

with open("backend/app/services/ai_service.py", "r", encoding="utf-8") as f:
    text = f.read()

pattern = r'''(ans = calculate_risk\(sessions\[0\]\).*?return ans)'''

replacement = r'''ans = calculate_risk(sessions[0])
    
    if ans["risk_level"] == "high":
        try:
            supabase.table("alerts").insert({
                "patient_id": patient_id,
                "message": "High injury risk detected. Immediate review required."
            }).execute()
        except:
            pass

    return ans'''

text = re.sub(pattern, replacement, text, flags=re.DOTALL)

with open("backend/app/services/ai_service.py", "w", encoding="utf-8") as f:
    f.write(text)
