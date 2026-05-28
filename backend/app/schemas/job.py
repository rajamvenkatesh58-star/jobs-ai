import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class JobListingRead(BaseModel):
    id: uuid.UUID
    seek_job_id: str
    title: str
    company: str | None
    location: str | None
    category: str | None
    work_type: str | None
    salary_range: str | None
    description: str | None
    listing_url: str
    published_at: datetime | None
    ingested_at: datetime
    score_results: dict | None

    model_config = {"from_attributes": True}


class JobListingWithScore(JobListingRead):
    my_score: int | None = None
    my_score_reasoning: str | None = None


class JobIngestResponse(BaseModel):
    new_jobs_found: int
    total_fetched: int
    message: str
