import logging
from fastapi import HTTPException
from app.db.supabase_client import get_supabase
from app.models.message_models import (
    MessageCreate,
    MessageResponse,
    MessageItem,
    MessageThreadResponse,
)

logger = logging.getLogger(__name__)

_MIGRATION_PENDING_MSG = (
    "The messages table is not yet available. "
    "Please run migration_v2.sql in Supabase before using this endpoint."
)


def send_message(payload: MessageCreate) -> MessageResponse:
    supabase = get_supabase()
    if payload.sender_type not in {"patient", "doctor"}:
        raise HTTPException(
            status_code=400,
            detail="sender_type must be 'patient' or 'doctor'",
        )
    try:
        row = {
            "patient_id": payload.patient_id,
            "sender_type": payload.sender_type,
            "sender_id": payload.sender_id,
            "content": payload.content,
        }
        response = supabase.table("messages").insert(row).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to send message")
        return MessageResponse(**response.data[0])
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("send_message failed (migration pending?): %s", exc)
        raise HTTPException(status_code=503, detail=_MIGRATION_PENDING_MSG)


def get_messages(patient_id: str, limit: int = 50) -> MessageThreadResponse:
    supabase = get_supabase()
    try:
        response = (
            supabase.table("messages")
            .select("*")
            .eq("patient_id", patient_id)
            .order("created_at", desc=False)
            .limit(limit)
            .execute()
        )
        rows = response.data or []
    except Exception as exc:
        logger.warning("get_messages failed (migration pending?): %s", exc)
        return MessageThreadResponse(messages=[])

    # Collect sender IDs by type for batch name resolution
    patient_sender_ids = list(
        {r["sender_id"] for r in rows if r.get("sender_type") == "patient"}
    )
    staff_sender_ids = list(
        {r["sender_id"] for r in rows if r.get("sender_type") == "doctor"}
    )

    patient_name_map: dict[str, str] = {}
    if patient_sender_ids:
        try:
            p_resp = (
                supabase.table("patients")
                .select("id, name")
                .in_("id", patient_sender_ids)
                .execute()
            )
            patient_name_map = {p["id"]: p["name"] for p in (p_resp.data or [])}
        except Exception as exc:
            logger.info("patient name lookup failed (pre-migration?): %s", exc)

    staff_name_map: dict[str, str] = {}
    if staff_sender_ids:
        try:
            s_resp = (
                supabase.table("staff")
                .select("id, name")
                .in_("id", staff_sender_ids)
                .execute()
            )
            staff_name_map = {s["id"]: s["name"] for s in (s_resp.data or [])}
        except Exception as exc:
            logger.info("staff name lookup failed (pre-migration?): %s", exc)

    messages = [
        MessageItem(
            id=r["id"],
            sender_type=r["sender_type"],
            sender_name=patient_name_map.get(r["sender_id"])
            if r["sender_type"] == "patient"
            else staff_name_map.get(r["sender_id"]),
            content=r["content"],
            created_at=r["created_at"],
        )
        for r in rows
    ]

    return MessageThreadResponse(messages=messages)
