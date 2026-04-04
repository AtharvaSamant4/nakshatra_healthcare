import logging
from fastapi import HTTPException
from app.db.supabase_client import get_supabase
from app.models.user_models import UserCreate, UserResponse, UserListItem

logger = logging.getLogger(__name__)

# After the V2 migration, "users" is renamed to "patients".
# These functions try "patients" first and fall back to "users" so the
# backend runs correctly both before and after the migration.


def _user_table(supabase) -> str:
    """Return 'patients' if the table exists, else fall back to 'users'."""
    try:
        supabase.table("patients").select("id").limit(1).execute()
        return "patients"
    except Exception:
        logger.info("patients table not found, falling back to users")
        return "users"


def create_user(payload: UserCreate) -> UserResponse:
    supabase = get_supabase()
    table = _user_table(supabase)
    data = payload.model_dump(exclude_none=True)
    response = supabase.table(table).insert(data).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create user")
    return UserResponse(**response.data[0])


def list_users() -> list[UserListItem]:
    supabase = get_supabase()
    table = _user_table(supabase)
    response = (
        supabase.table(table)
        .select("id, name, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    return [UserListItem(**row) for row in (response.data or [])]


def get_user(user_id: str) -> UserResponse:
    supabase = get_supabase()
    table = _user_table(supabase)
    response = supabase.table(table).select("*").eq("id", user_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**response.data[0])
