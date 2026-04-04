import logging
from fastapi import HTTPException
from app.db.supabase_client import get_supabase
from app.models.staff_models import StaffCreate, StaffResponse, StaffListItem

logger = logging.getLogger(__name__)

_MIGRATION_PENDING_MSG = (
    "The staff table is not yet available. "
    "Please run migration_v2.sql in Supabase before using this endpoint."
)


def create_staff(payload: StaffCreate) -> StaffResponse:
    supabase = get_supabase()
    try:
        row = payload.model_dump(exclude_none=True)
        response = supabase.table("staff").insert(row).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create staff member")
        return StaffResponse(**response.data[0])
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("create_staff failed (migration pending?): %s", exc)
        raise HTTPException(status_code=503, detail=_MIGRATION_PENDING_MSG)


def list_staff(role: str | None = None) -> list[StaffListItem]:
    supabase = get_supabase()
    try:
        query = supabase.table("staff").select("id, name, role, specialization")
        if role:
            query = query.eq("role", role)
        response = query.order("created_at", desc=False).execute()
        return [StaffListItem(**row) for row in (response.data or [])]
    except Exception as exc:
        logger.warning("list_staff failed (migration pending?): %s", exc)
        return []


def get_staff(staff_id: str) -> StaffResponse:
    supabase = get_supabase()
    try:
        response = supabase.table("staff").select("*").eq("id", staff_id).execute()
    except Exception as exc:
        logger.warning("get_staff failed (migration pending?): %s", exc)
        raise HTTPException(status_code=503, detail=_MIGRATION_PENDING_MSG)
    if not response.data:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return StaffResponse(**response.data[0])
