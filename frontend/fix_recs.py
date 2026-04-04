import re

path = "../backend/app/services/ai_service.py"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

old_func = '''def list_recommendations(patient_id: str) -> list[dict]:
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("ai_recommendations")
            .select("id, patient_id, recommendation_json, created_at")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        return resp.data or []
    except Exception as exc:
        logger.warning("list_recommendations failed: %s", exc)
        return []'''

new_func = '''def list_recommendations(patient_id: str) -> list[dict]:
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("ai_recommendations")
            .select("id, patient_id, recommendation_json, created_at")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        data = resp.data or []
        for r in data:
            if "recommendation_json" in r:
                r["recommendation"] = r.pop("recommendation_json")
        return data
    except Exception as exc:
        logger.warning("list_recommendations failed: %s", exc)
        return []'''

text = text.replace(old_func, new_func)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)
