import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import get_current_user
from app.db.session import get_db
from app.models.job import JobListing
from app.models.profile import CandidateProfile
from app.models.user import User
from app.schemas.job import JobIngestResponse, JobListingWithScore
from app.services.audit_logger import AuditLogger
from app.services.seek_ingestor import ingest_for_profile

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/ingest", response_model=JobIngestResponse)
async def trigger_ingest(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Manually trigger a Seek RSS ingest for the current user's profile."""
    result = await db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    if not profile.seek_keywords and not profile.seek_categories:
        raise HTTPException(
            status_code=422,
            detail="Configure seek_keywords or seek_categories in your profile first",
        )

    audit = AuditLogger(user_id=current_user.id)
    counts = await ingest_for_profile(profile, db, audit)
    return JobIngestResponse(
        new_jobs_found=counts["new_jobs"],
        total_fetched=counts["total_fetched"],
        message=f"Ingestion complete. {counts['new_jobs']} new job(s) added.",
    )


@router.get("/", response_model=list[JobListingWithScore])
async def list_jobs(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    min_score: int = Query(default=0, ge=0, le=100),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """Return all jobs with the current user's score, filtered by min_score."""
    result = await db.execute(
        select(JobListing).order_by(JobListing.ingested_at.desc()).limit(limit).offset(offset)
    )
    jobs = result.scalars().all()

    user_key = str(current_user.id)
    output: list[JobListingWithScore] = []
    for job in jobs:
        scores = job.score_results or {}
        user_score = scores.get(user_key, {})
        score = user_score.get("score")
        if score is not None and score < min_score:
            continue
        output.append(
            JobListingWithScore(
                **{c.key: getattr(job, c.key) for c in job.__table__.columns},
                my_score=score,
                my_score_reasoning=user_score.get("reasoning"),
            )
        )

    return output


@router.get("/{job_id}", response_model=JobListingWithScore)
async def get_job(
    job_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(JobListing).where(JobListing.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    user_key = str(current_user.id)
    user_score = (job.score_results or {}).get(user_key, {})
    return JobListingWithScore(
        **{c.key: getattr(job, c.key) for c in job.__table__.columns},
        my_score=user_score.get("score"),
        my_score_reasoning=user_score.get("reasoning"),
    )
