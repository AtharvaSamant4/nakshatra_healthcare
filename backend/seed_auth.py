import asyncio
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load the backend environments
load_dotenv()
url = os.environ.get("SUPABASE_URL")
# IMPORTANT: We MUST use the service_role key to bypass policies and create users directly
service_key = os.environ.get("SUPABASE_KEY")  

supabase: Client = create_client(url, service_key)

async def seed_auth():
    print("Fetching staff...")
    staff = supabase.table("staff").select("*").execute().data
    for s in staff:
        email = s.get("email") or f"{s['name'].replace(' ', '').lower()}@test.local"
        try:
            res = supabase.auth.admin.create_user({
                "email": email,
                "password": "password123",
                "email_confirm": True,
                "user_metadata": {
                    "role": s['role'], 
                    "id": s['id'],
                    "name": s['name']
                } 
            })
            print(f"âœ… Created Auth User: {email} (Role: {s['role']})")
        except Exception as e:
            print(f"âš ï¸ Skipped {email}: {e}")

    print("\nFetching patients...")
    patients = supabase.table("patients").select("*").execute().data
    for p in patients:
        email = p.get("email") or f"{p['name'].replace(' ', '').lower()}@test.local"
        try:
            res = supabase.auth.admin.create_user({
                "email": email,
                "password": "password123",
                "email_confirm": True,
                "user_metadata": {
                    "role": "patient", 
                    "id": p['id'],
                    "name": p['name']
                }
            })
            print(f"âœ… Created Auth User for Patient: {email}")
        except Exception as e:
            print(f"âš ï¸ Skipped {email}: {e}")

if __name__ == "__main__":
    asyncio.run(seed_auth())
