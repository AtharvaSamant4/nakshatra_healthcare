from fastapi import APIRouter, Query
from typing import Optional
from app.models.cognitive_test_models import (
    CognitiveTestCreate,
    CognitiveTestCreateResponse,
    CognitiveTestListResponse,
    CognitiveTestEvaluateRequest,
    CognitiveTestEvaluateResponse,
)
from app.services import cognitive_test_service

router = APIRouter(prefix="/api/cognitive-tests", tags=["cognitive-tests"])


@router.post("", response_model=CognitiveTestCreateResponse, status_code=201)
def create_cognitive_test(payload: CognitiveTestCreate):
    return cognitive_test_service.create_cognitive_test_session(payload)


@router.get("", response_model=CognitiveTestListResponse)
def list_cognitive_tests(
    user_id: str = Query(...),
    test_type: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
):
    return cognitive_test_service.list_cognitive_test_sessions(
        user_id=user_id, test_type=test_type, limit=limit
    )


@router.post("/evaluate", response_model=CognitiveTestEvaluateResponse)
def evaluate_response(payload: CognitiveTestEvaluateRequest):
    return cognitive_test_service.evaluate_response(payload)
