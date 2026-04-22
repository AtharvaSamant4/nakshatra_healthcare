from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import http_exception_handler

from app.routers import users, exercises, sessions, games, progress, feedback, cognitive_tests
from app.routers import staff, patients, prescriptions, messages, ai
from app.routers import plan
from fastapi.exceptions import RequestValidationError
from postgrest.exceptions import APIError

app = FastAPI(title="Nakshatra Healthcare API", version="1.0.0")

import os

origins = os.getenv("ALLOWED_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(users.router)
app.include_router(exercises.router)
app.include_router(sessions.router)
app.include_router(games.router)
app.include_router(progress.router)
app.include_router(feedback.router)
app.include_router(cognitive_tests.router)
# V2 hospital workflow routers
app.include_router(staff.router)
app.include_router(patients.router)
app.include_router(prescriptions.router)
app.include_router(messages.router)
app.include_router(ai.router)
app.include_router(plan.router)


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    # Preserve the original status code and detail from HTTPException
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors(), "status_code": 422},
        )
    if isinstance(exc, APIError):
        # Supabase/Postgrest errors - like invalid UUID syntax to PostgreSQL
        return JSONResponse(
            status_code=400,
            content={"detail": exc.message, "status_code": 400},
        )
    # Only fires for truly unexpected errors - HTTPException is handled above
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "status_code": 500},
    )
