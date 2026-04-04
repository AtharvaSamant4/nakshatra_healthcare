from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Query
from app.models.staff_models import StaffCreate, StaffResponse, StaffListItem
from app.services import staff_service

router = APIRouter(prefix="/api/staff", tags=["staff"])


@router.post("", response_model=StaffResponse, status_code=201)
def create_staff(payload: StaffCreate):
    return staff_service.create_staff(payload)


@router.get("", response_model=list[StaffListItem])
def list_staff(role: Optional[str] = Query(default=None)):
    return staff_service.list_staff(role=role)


@router.get("/{staff_id}", response_model=StaffResponse)
def get_staff(staff_id: UUID):
    return staff_service.get_staff(str(staff_id))
