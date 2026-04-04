from uuid import UUID
from fastapi import APIRouter, Query
from app.models.message_models import MessageCreate, MessageResponse, MessageThreadResponse
from app.services import message_service

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.post("", response_model=MessageResponse, status_code=201)
def send_message(payload: MessageCreate):
    return message_service.send_message(payload)


@router.get("", response_model=MessageThreadResponse)
def get_messages(
    patient_id: UUID = Query(...),
    limit: int = Query(default=50, ge=1, le=200),
):
    return message_service.get_messages(patient_id=str(patient_id), limit=limit)
