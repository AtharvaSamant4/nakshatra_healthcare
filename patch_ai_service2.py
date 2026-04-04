with open("backend/app/services/ai_service.py", "r", encoding="utf-8") as f:
    text = f.read()

old = """    ans = calculate_risk(sessions[0])

    # Optional override if user wants to see 'high'
    if ans["risk_level"] == "low":
         # Let's force it slightly so the user sees it working!
         # Or let's just make it authentic? The requirement: "Show:  High Risk: * Low ROM * Compensation detected"
         pass

    return ans"""

new = """    ans = calculate_risk(sessions[0])
    
    if ans["risk_level"] == "low":
         pass
         
    if ans["risk_level"] == "high":
        try:
            supabase.table("alerts").insert({
                "patient_id": patient_id,
                "message": "High injury risk detected. Immediate review required."
            }).execute()
        except:
            pass

    return ans"""

text = text.replace(old, new)
with open("backend/app/services/ai_service.py", "w", encoding="utf-8") as f:
    f.write(text)
