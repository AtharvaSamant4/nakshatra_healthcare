from fastapi import APIRouter
from pydantic import BaseModel
from app.services import ai_service

router = APIRouter(prefix="/api/ai", tags=["ai"])


# ─── Request / Response models ────────────────────────────────────────────────

class PatientChatRequest(BaseModel):
    patient_id: str
    message: str


class PatientChatResponse(BaseModel):
    response: str


class GenerateReportRequest(BaseModel):
    patient_id: str


class ReportResponse(BaseModel):
    id: str | None
    patient_id: str
    report: dict
    created_at: str | None


class DoctorChatRequest(BaseModel):
    doctor_id: str
    patient_id: str
    message: str


class DoctorChatResponse(BaseModel):
    response: str


class PredictRecoveryRequest(BaseModel):
    patient_id: str


class PredictRecoveryResponse(BaseModel):
    estimated_days: int | None
    confidence: str
    target_rom: float | None = None
    progress_rate_per_day: float | None = None

class GenerateWeeklyReportRequest(BaseModel):
    patient_id: str


class RecommendPlanRequest(BaseModel):
    patient_id: str


class RecommendationResponse(BaseModel):
    id: str | None
    patient_id: str
    recommendation: dict
    created_at: str | None


class SeedDemoRequest(BaseModel):
    patient_id: str


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/patient-chat", response_model=PatientChatResponse)
def patient_chat(payload: PatientChatRequest):
    response = ai_service.patient_chat(payload.patient_id, payload.message)
    return PatientChatResponse(response=response)


@router.post("/generate-report", response_model=ReportResponse)
def generate_report(payload: GenerateReportRequest):
    result = ai_service.generate_report(payload.patient_id)
    return ReportResponse(**result)


@router.get("/reports/{patient_id}")
def list_reports(patient_id: str):
    return ai_service.list_reports(patient_id)


@router.post("/doctor-chat", response_model=DoctorChatResponse)
def doctor_chat(payload: DoctorChatRequest):
    response = ai_service.doctor_chat(payload.doctor_id, payload.patient_id, payload.message)
    return DoctorChatResponse(response=response)


@router.post("/generate-weekly-report", response_model=ReportResponse)
def generate_weekly_report(payload: GenerateWeeklyReportRequest):
    result = ai_service.generate_weekly_report(payload.patient_id)
    return ReportResponse(**result)


@router.post("/recommend-plan", response_model=RecommendationResponse)
def recommend_plan(payload: RecommendPlanRequest):
    result = ai_service.generate_recommendations(payload.patient_id)
    return RecommendationResponse(**result)


@router.get("/recommendations/{patient_id}")
def list_recommendations(patient_id: str):
    return ai_service.list_recommendations(patient_id)


@router.post("/recovery-prediction", response_model=PredictRecoveryResponse)
def predict_recovery(payload: PredictRecoveryRequest):
    return ai_service.predict_recovery(payload.patient_id)


@router.post("/seed-demo")
def seed_demo(payload: SeedDemoRequest):
    """
    Seed 7 days of demo exercise + game sessions, then generate
    a weekly report and recommendation. Safe to call multiple times.
    """
    from app.services import demo_seeder
    return demo_seeder.seed(payload.patient_id)


class RecoveryPredictionRequest(BaseModel):
    patient_id: str


class RecoveryPredictionResponse(BaseModel):
    estimated_days: int | None
    confidence: str  # "low" | "medium" | "high"
    initial_rom: float | None
    latest_rom: float | None
    target_rom: float
    progress_rate_per_day: float | None


@router.post("/recovery-prediction", response_model=RecoveryPredictionResponse)
def recovery_prediction(payload: RecoveryPredictionRequest):
    return ai_service.predict_recovery(payload.patient_id)

class AdaptivePlanRequest(BaseModel):
    patient_id: str

class AdaptivePlanResponse(BaseModel):
    reps: int
    sets: int
    intensity: str
    reason: str

@router.post("/adaptive-plan", response_model=AdaptivePlanResponse)
def adaptive_plan(payload: AdaptivePlanRequest):
    return ai_service.generate_adaptive_plan(payload.patient_id)

class CalculateRiskRequest(BaseModel):
    patient_id: str

class CalculateRiskResponse(BaseModel):
    risk_level: str
    reasons: list[str]

@router.post("/calculate-risk", response_model=CalculateRiskResponse)
def calculate_risk_endpoint(payload: CalculateRiskRequest):
    return ai_service.get_risk_assessment(payload.patient_id)

class RecoveryScoreRequest(BaseModel):
    patient_id: str

class RecoveryScoreResponse(BaseModel):
    recovery_score: int

@router.post("/recovery-score", response_model=RecoveryScoreResponse)
def get_recovery_score(payload: RecoveryScoreRequest):
    return ai_service.calculate_recovery_score(payload.patient_id)
