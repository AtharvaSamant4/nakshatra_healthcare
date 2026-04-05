from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.supabase_client import get_supabase

# Under /api/auth so same-origin Next.js rewrite (/api/* → FastAPI) matches other routers.
router = APIRouter(prefix="/api/auth", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(req: LoginRequest):
    s = get_supabase()
    
    # Check staff
    staff_res = s.table("staff").select("*").eq("email", req.email).execute()
    if staff_res.data:
        user = staff_res.data[0]
        return {
            "token": "fake-jwt-token",
            "role": user.get("role"),
            "user": user
        }
    
    # Check patients
    pat_res = s.table("patients").select("*").eq("email", req.email).execute()
    if pat_res.data:
        user = pat_res.data[0]
        return {
            "token": "fake-jwt-token",
            "role": "patient",
            "user": user
        }
        
    raise HTTPException(status_code=401, detail="Invalid email or password")
