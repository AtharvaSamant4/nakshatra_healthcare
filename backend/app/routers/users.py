from uuid import UUID
from fastapi import APIRouter
from app.models.user_models import UserCreate, UserResponse, UserListItem
from app.services import user_service

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("", response_model=UserResponse, status_code=201)
def create_user(payload: UserCreate):
    return user_service.create_user(payload)


@router.get("", response_model=list[UserListItem])
def list_users():
    return user_service.list_users()


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: UUID):
    return user_service.get_user(str(user_id))
