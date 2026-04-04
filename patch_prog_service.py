def patch_service():
    new_func = """
def get_improvement(user_id: str) -> dict:
    from app.db.supabase_client import get_supabase
    from datetime import datetime, timezone, timedelta
    supabase = get_supabase()
    now = datetime.now(timezone.utc)
    current_start = (now - timedelta(days=7)).isoformat()
    previous_start = (now - timedelta(days=14)).isoformat()
    
    cur_resp = supabase.table("exercise_sessions").select("form_score").eq("user_id", user_id).gte("completed_at", current_start).lte("completed_at", now.isoformat()).execute()
    cur_scores = [r["form_score"] for r in (cur_resp.data or []) if r.get("form_score") is not None]
    
    prev_resp = supabase.table("exercise_sessions").select("form_score").eq("user_id", user_id).gte("completed_at", previous_start).lt("completed_at", current_start).execute()
    prev_scores = [r["form_score"] for r in (prev_resp.data or []) if r.get("form_score") is not None]
    
    cur_avg = sum(cur_scores) / len(cur_scores) if cur_scores else 0
    prev_avg = sum(prev_scores) / len(prev_scores) if prev_scores else 0
    
    if prev_avg == 0:
        improvement = 100 if cur_avg > 0 else 0
    else:
        improvement = round(((cur_avg - prev_avg) / prev_avg) * 100)
        
    return {"improvement": improvement}
"""
    with open("backend/app/services/progress_service.py", "a", encoding="utf-8") as f:
        f.write(new_func)

patch_service()
