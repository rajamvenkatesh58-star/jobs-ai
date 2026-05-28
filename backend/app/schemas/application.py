import uuid
from datetime import datetime

from pydantic import BaseModel


class ApplicationRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    job_id: uuid.UUID
    status: str
    match_score: int | None
    score_reasoning: str | None
    resume_pdf_path: str | None
    cover_letter_pdf_path: str | None
    created_at: datetime
    reviewed_at: datetime | None
    submitted_at: datetime | None

    model_config = {"from_attributes": True}


class ApplicationStatusUpdate(BaseModel):
    status: str  # approved | dismissed | submitted


class GenerateDocumentsRequest(BaseModel):
    job_id: uuid.UUID
