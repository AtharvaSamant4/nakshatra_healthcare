from fastapi import APIRouter, Query
from typing import Optional
from app.models.game_models import (
    GameSessionCreate,
    GameSessionCreateResponse,
    GameSessionListResponse,
)
from app.services import game_service

router = APIRouter(prefix="/api/game-sessions", tags=["game-sessions"])


@router.post("", response_model=GameSessionCreateResponse, status_code=201)
def create_game_session(payload: GameSessionCreate):
    return game_service.create_game_session(payload)


@router.get("", response_model=GameSessionListResponse)
def list_game_sessions(
    user_id: str = Query(...),
    game_type: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
):
    return game_service.list_game_sessions(user_id=user_id, game_type=game_type, limit=limit)
