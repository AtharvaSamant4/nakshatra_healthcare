from fastapi import APIRouter, Query
from app.models.session_models import (
    SessionCreate,
    SessionCreateResponse,
    SessionDetail,
    SessionListResponse,
)
from app.services import session_service

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=SessionCreateResponse, status_code=201)
def create_session(payload: SessionCreate):
    return session_service.create_session(payload)


@router.get("", response_model=SessionListResponse)
def list_sessions(
    user_id: str = Query(...),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    return session_service.list_sessions(user_id=user_id, limit=limit, offset=offset)


@router.get("/{session_id}", response_model=SessionDetail)
def get_session(session_id: str):
    return session_service.get_session(session_id)
