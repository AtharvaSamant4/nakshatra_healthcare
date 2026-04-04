import logging
from fastapi import HTTPException
from app.db.supabase_client import get_supabase
from app.models.patient_models import (
    PatientCreate,
    PatientUpdate,
    PatientResponse,
    PatientListItem,
    PatientCreateResponse,
)

logger = logging.getLogger(__name__)

_MIGRATION_PENDING_MSG = (
    "The patients table is not yet available. "
    "Please run migration_v2.sql in Supabase before using this endpoint."
)


def _patients_table_exists(supabase) -> bool:
    try:
        supabase.table("patients").select("id").limit(1).execute()
        return True
    except Exception:
        return False


def create_patient(payload: PatientCreate) -> PatientCreateResponse:
    supabase = get_supabase()
    if not _patients_table_exists(supabase):
        raise HTTPException(status_code=503, detail=_MIGRATION_PENDING_MSG)
    row = payload.model_dump(exclude_none=True)
    row.setdefault("status", "registered")
    response = supabase.table("patients").insert(row).execute()
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create patient")
    data = response.data[0]
    return PatientCreateResponse(
        id=data["id"],
        name=data["name"],
        status=data.get("status"),
        doctor_id=data.get("doctor_id"),
        created_at=data["created_at"],
    )


def list_patients(
    doctor_id: str | None = None,
    status: str | None = None,
) -> list[PatientListItem]:
    supabase = get_supabase()
    try:
        query = supabase.table("patients").select(
            "id, name, status, doctor_id, injury_type, severity"
        )
        if doctor_id:
            query = query.eq("doctor_id", doctor_id)
        if status:
            query = query.eq("status", status)

        response = query.execute()
        patients = response.data or []
        
        # Hydrate with alerts
        try:
            pat_ids = [p["id"] for p in patients]
            if pat_ids:
                al_resp = supabase.table("alerts").select("patient_id").in_("patient_id", pat_ids).execute()
                alert_ids = {a["patient_id"] for a in (al_resp.data or [])}
                for p in patients:
                    p["has_alert"] = p["id"] in alert_ids
        except:
            pass

        return [PatientListItem(**row) for row in patients]
    except Exception as exc:
        logger.warning("list_patients failed (migration pending?): %s", exc)
        return []


def get_patient(patient_id: str) -> PatientResponse:
    supabase = get_supabase()
    try:
        response = supabase.table("patients").select("*").eq("id", patient_id).execute()
    except Exception as exc:
        logger.warning("get_patient query failed (migration pending?): %s", exc)
        raise HTTPException(status_code=503, detail=_MIGRATION_PENDING_MSG)
    if not response.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    row = response.data[0]
    return PatientResponse(
        id=row["id"],
        name=row["name"],
        email=row.get("email"),
        age=row.get("age"),
        phone=row.get("phone"),
        condition_notes=row.get("condition_notes"),
        doctor_id=row.get("doctor_id"),
        status=row.get("status"),
        diagnosis=row.get("diagnosis"),
        injury_type=row.get("injury_type"),
        severity=row.get("severity"),
        emergency=row.get("emergency"),
        created_at=row["created_at"],
    )


def update_patient(patient_id: str, payload: PatientUpdate) -> PatientResponse:
    supabase = get_supabase()
    if not _patients_table_exists(supabase):
        raise HTTPException(status_code=503, detail=_MIGRATION_PENDING_MSG)
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update")
    try:
        response = (
            supabase.table("patients").update(updates).eq("id", patient_id).execute()
        )
    except Exception as exc:
        logger.warning("update_patient failed: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to update patient")
    if not response.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    row = response.data[0]
    return PatientResponse(
        id=row["id"],
        name=row["name"],
        email=row.get("email"),
        age=row.get("age"),
        phone=row.get("phone"),
        condition_notes=row.get("condition_notes"),
        doctor_id=row.get("doctor_id"),
        status=row.get("status"),
        diagnosis=row.get("diagnosis"),
        injury_type=row.get("injury_type"),
        severity=row.get("severity"),
        emergency=row.get("emergency"),
        created_at=row["created_at"],
    )
