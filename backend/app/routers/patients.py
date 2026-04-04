from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Query
from app.models.patient_models import (
    PatientCreate,
    PatientUpdate,
    PatientResponse,
    PatientListItem,
    PatientCreateResponse,
)
from app.services import patient_service

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.post("", response_model=PatientCreateResponse, status_code=201)
def create_patient(payload: PatientCreate):
    return patient_service.create_patient(payload)


@router.get("", response_model=list[PatientListItem])
def list_patients(
    doctor_id: Optional[UUID] = Query(default=None),
    status: Optional[str] = Query(default=None),
):
    return patient_service.list_patients(
        doctor_id=str(doctor_id) if doctor_id else None,
        status=status,
    )


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: UUID):
    return patient_service.get_patient(str(patient_id))


@router.patch("/{patient_id}", response_model=PatientResponse)
def update_patient(patient_id: UUID, payload: PatientUpdate):
    return patient_service.update_patient(str(patient_id), payload)
