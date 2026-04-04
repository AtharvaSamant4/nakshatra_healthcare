from app.db.supabase_client import get_supabase
import asyncio

try:
    supabase = get_supabase()
    res = supabase.table("alerts").select("id").limit(1).execute()
    print("Table exists!")
except Exception as e:
    print("Error:", e)
