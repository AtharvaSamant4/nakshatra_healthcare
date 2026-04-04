from uuid import UUID
from fastapi import APIRouter, Query
from app.models.prescription_models import (
    PrescriptionCreate,
    PrescriptionUpdate,
    PrescriptionCreateResponse,
    PrescriptionListItem,
)
from app.services import prescription_service

router = APIRouter(prefix="/api/prescriptions", tags=["prescriptions"])


@router.post("", response_model=PrescriptionCreateResponse, status_code=201)
def create_prescription(payload: PrescriptionCreate):
    return prescription_service.create_prescription(payload)


@router.get("", response_model=list[PrescriptionListItem])
def list_prescriptions(patient_id: UUID = Query(...)):
    return prescription_service.list_prescriptions(patient_id=str(patient_id))


@router.patch("/{prescription_id}")
def update_prescription(prescription_id: UUID, payload: PrescriptionUpdate):
    return prescription_service.update_prescription(str(prescription_id), payload)
