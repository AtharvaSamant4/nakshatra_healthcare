with open("backend/app/services/patient_service.py", "r", encoding="utf-8") as f:
    text = f.read()

import re

old = r'''    try:
        query = supabase.table\("patients"\)\.select\(
            "id, name, status, doctor_id, injury_type, severity"
        .*?return \[PatientListItem\(\*\*row\) for row in \(\s*response\.data or \[\]\)\s*\]'''

new = '''    try:
        query = supabase.table("patients").select(
            "id, name, status, doctor_id, injury_type, severity"
        )
        if doctor_id:
            query = query.eq("doctor_id", doctor_id)
        if status:
            query = query.eq("status", status)

        response = query.execute()
        patients = response.data or []
        
        # Hydrate with alerts
        try:
            pat_ids = [p["id"] for p in patients]
            if pat_ids:
                al_resp = supabase.table("alerts").select("patient_id").in_("patient_id", pat_ids).execute()
                alert_ids = {a["patient_id"] for a in (al_resp.data or [])}
                for p in patients:
                    p["has_alert"] = p["id"] in alert_ids
        except:
            pass

        return [PatientListItem(**row) for row in patients]'''

text = re.sub(old, new, text, flags=re.DOTALL)

with open("backend/app/services/patient_service.py", "w", encoding="utf-8") as f:
    f.write(text)
