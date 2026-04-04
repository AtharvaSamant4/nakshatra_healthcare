from fastapi import HTTPException
from app.db.supabase_client import get_supabase
from app.models.user_models import UserCreate, UserResponse, UserListItem


def create_user(payload: UserCreate) -> UserResponse:
    supabase = get_supabase()

    data = payload.model_dump(exclude_none=True)

    response = supabase.table("users").insert(data).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create user")

    return UserResponse(**response.data[0])


def list_users() -> list[UserListItem]:
    supabase = get_supabase()

    response = supabase.table("users").select("id, name, created_at").order("created_at", desc=True).execute()

    return [UserListItem(**row) for row in (response.data or [])]


def get_user(user_id: str) -> UserResponse:
    supabase = get_supabase()

    response = supabase.table("users").select("*").eq("id", user_id).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(**response.data[0])
