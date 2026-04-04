from app.db.supabase_client import get_supabase
s = get_supabase()
print(s.table('staff').select('*').limit(1).execute())
print(s.table('patients').select('*').limit(1).execute())
