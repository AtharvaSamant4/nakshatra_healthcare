import logging
from fastapi import HTTPException
from app.db.supabase_client import get_supabase
from app.models.prescription_models import (
    PrescriptionCreate,
    PrescriptionUpdate,
    PrescriptionCreateResponse,
    PrescriptionListItem,
    PrescriptionCompliance,
)

logger = logging.getLogger(__name__)

_MIGRATION_PENDING_MSG = (
    "The prescriptions table is not yet available. "
    "Please run migration_v2.sql in Supabase before using this endpoint."
)


def create_prescription(payload: PrescriptionCreate) -> PrescriptionCreateResponse:
    supabase = get_supabase()
    try:
        row = payload.model_dump(exclude_none=True)
        row.setdefault("status", "active")
        response = supabase.table("prescriptions").insert(row).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create prescription")
        data = response.data[0]
        return PrescriptionCreateResponse(
            id=data["id"],
            patient_id=data["patient_id"],
            exercise_id=data.get("exercise_id"),
            status=data["status"],
            created_at=data["created_at"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("create_prescription failed (migration pending?): %s", exc)
        raise HTTPException(status_code=503, detail=_MIGRATION_PENDING_MSG)


def list_prescriptions(patient_id: str) -> list[PrescriptionListItem]:
    supabase = get_supabase()
    try:
        response = (
            supabase.table("prescriptions")
            .select("*")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
            .execute()
        )
        prescriptions = response.data or []
    except Exception as exc:
        logger.warning("list_prescriptions failed (migration pending?): %s", exc)
        return []

    # Bulk resolve exercise names in one query
    exercise_ids = list(
        {p["exercise_id"] for p in prescriptions if p.get("exercise_id")}
    )
    exercise_name_map: dict[str, str] = {}
    if exercise_ids:
        try:
            ex_resp = (
                supabase.table("exercises")
                .select("id, name")
                .in_("id", exercise_ids)
                .execute()
            )
            exercise_name_map = {e["id"]: e["name"] for e in (ex_resp.data or [])}
        except Exception as exc:
            logger.warning("exercise name lookup failed: %s", exc)

    result: list[PrescriptionListItem] = []
    for p in prescriptions:
        # Count sessions linked to this prescription for compliance.
        # prescription_id column may not exist yet in exercise_sessions.
        sessions_completed = 0
        last_session_at: str | None = None
        try:
            count_resp = (
                supabase.table("exercise_sessions")
                .select("id, completed_at", count="exact")
                .eq("prescription_id", p["id"])
                .order("completed_at", desc=True)
                .execute()
            )
            sessions_completed = count_resp.count or 0
            if count_resp.data:
                last_session_at = count_resp.data[0].get("completed_at")
        except Exception as exc:
            # prescription_id column doesn't exist yet — compliance is 0
            logger.info("compliance query skipped (column pending?): %s", exc)

        result.append(
            PrescriptionListItem(
                id=p["id"],
                exercise_id=p.get("exercise_id"),
                exercise_name=exercise_name_map.get(p["exercise_id"])
                if p.get("exercise_id")
                else None,
                game_type=p.get("game_type"),
                target_reps=p.get("target_reps"),
                frequency=p.get("frequency"),
                priority=p.get("priority", "normal"),
                status=p.get("status", "active"),
                compliance=PrescriptionCompliance(
                    sessions_completed=sessions_completed,
                    last_session_at=last_session_at,
                ),
            )
        )

    return result


def update_prescription(prescription_id: str, payload: PrescriptionUpdate) -> dict:
    supabase = get_supabase()
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update")
    try:
        response = (
            supabase.table("prescriptions")
            .update(updates)
            .eq("id", prescription_id)
            .execute()
        )
    except Exception as exc:
        logger.warning("update_prescription failed (migration pending?): %s", exc)
        raise HTTPException(status_code=503, detail=_MIGRATION_PENDING_MSG)
    if not response.data:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return response.data[0]
