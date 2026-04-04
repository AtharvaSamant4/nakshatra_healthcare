import re

path = "../backend/app/services/ai_service.py"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

old_func = '''def list_reports(patient_id: str) -> list[dict]:
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("reports")
            .select("id, patient_id, report_json, created_at")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        return resp.data or []
    except Exception as exc:
        logger.warning("list_reports failed: %s", exc)
        return []'''

new_func = '''def list_reports(patient_id: str) -> list[dict]:
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("reports")
            .select("id, patient_id, report_json, created_at")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        data = resp.data or []
        for r in data:
            if "report_json" in r:
                r["report"] = r.pop("report_json")
        return data
    except Exception as exc:
        logger.warning("list_reports failed: %s", exc)
        return []'''

text = text.replace(old_func, new_func)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)
