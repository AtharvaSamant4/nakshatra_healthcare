from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from app.config.settings import get_settings

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Validates a Supabase JWT (JSON Web Token) from the Authorization header.
    In a real production environment, you would use python-jose to decode and 
    verify the JWT signature against the Supabase JWT secret.
    Here we do a simple external verify via Supabase Auth API API.
    """
    token = credentials.credentials
    settings = get_settings()
    
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token missing")
        
    try:
        # Ask Supabase auth endpoints to verify the token for us
        response = httpx.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={"Authorization": f"Bearer {token}", "apikey": settings.supabase_key},
            timeout=5.0
        )
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
            
        user_data = response.json()
        return user_data
    except httpx.RequestError:
        raise HTTPException(status_code=503, detail="Unable to verify auth token with Supabase")

def require_doctor(current_user: dict = Depends(get_current_user)):
    # Example RBAC role check based on raw JWT metadata
    user_metadata = current_user.get("user_metadata", {})
    if user_metadata.get("role") != "doctor":
        raise HTTPException(status_code=403, detail="Forbidden. Doctor access required.")
    return current_user
