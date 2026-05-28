import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class InterviewSessionCreate(BaseModel):
    job_id: uuid.UUID


class QuestionAnswer(BaseModel):
    question_id: str
    audio_data_b64: str  # base64-encoded WAV from browser MediaRecorder


class InterviewSessionRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    job_id: uuid.UUID | None
    application_id: uuid.UUID | None
    status: str
    question_bank: list[Any] | None
    overall_score: int | None
    debrief_report: str | None
    debrief_pdf_path: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AnswerResult(BaseModel):
    question_id: str
    transcript: str
    star_score: int = Field(ge=0, le=100)
    clarity_score: int = Field(ge=0, le=100)
    relevance_score: int = Field(ge=0, le=100)
    completeness_score: int = Field(ge=0, le=100)
    feedback: str
