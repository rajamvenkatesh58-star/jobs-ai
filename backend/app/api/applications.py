import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import get_current_user
from app.db.session import get_db
from app.models.application import JobApplication
from app.models.job import JobListing
from app.models.profile import CandidateProfile
from app.models.user import User
from app.schemas.application import ApplicationRead, ApplicationStatusUpdate, GenerateDocumentsRequest
from app.services.audit_logger import AuditLogger
from app.services.job_scorer import score_job
from app.services.pdf_builder import build_pdf
from app.services.resume_generator import generate_cover_letter_html, generate_resume_html

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("/generate", response_model=ApplicationRead, status_code=201)
async def generate_documents(
    payload: GenerateDocumentsRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Score the job, generate resume + cover letter PDFs, create application record."""
    job_result = await db.execute(select(JobListing).where(JobListing.id == payload.job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    profile_result = await db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    audit = AuditLogger(user_id=current_user.id)

    score, reasoning = await score_job(job, profile, db, audit)

    resume_html = await generate_resume_html(current_user, profile, job, db, audit)
    cover_letter_html = await generate_cover_letter_html(current_user, profile, job, db, audit)

    safe_title = job.title[:40].replace(" ", "_")
    resume_path = await build_pdf(
        resume_html, current_user.id, "resume", safe_title, db, audit
    )
    cover_letter_path = await build_pdf(
        cover_letter_html, current_user.id, "cover_letter", safe_title, db, audit
    )

    application = JobApplication(
        user_id=current_user.id,
        job_id=job.id,
        match_score=score,
        score_reasoning=reasoning,
        resume_pdf_path=resume_path,
        cover_letter_pdf_path=cover_letter_path,
        resume_text=resume_html,
        cover_letter_text=cover_letter_html,
        status="pending_review",
    )
    db.add(application)
    await db.commit()
    await db.refresh(application)
    return application


@router.get("/", response_model=list[ApplicationRead])
async def list_applications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(JobApplication)
        .where(JobApplication.user_id == current_user.id)
        .order_by(JobApplication.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{application_id}", response_model=ApplicationRead)
async def get_application(
    application_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(JobApplication).where(
            JobApplication.id == application_id,
            JobApplication.user_id == current_user.id,
        )
    )
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


@router.patch("/{application_id}/status", response_model=ApplicationRead)
async def update_status(
    application_id: uuid.UUID,
    payload: ApplicationStatusUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    valid_statuses = {"approved", "dismissed", "submitted"}
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=422, detail=f"status must be one of {valid_statuses}")

    result = await db.execute(
        select(JobApplication).where(
            JobApplication.id == application_id,
            JobApplication.user_id == current_user.id,
        )
    )
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    from datetime import datetime, timezone

    application.status = payload.status
    if payload.status == "submitted":
        application.submitted_at = datetime.now(timezone.utc)
    elif payload.status in {"approved", "dismissed"}:
        application.reviewed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(application)
    return application


@router.get("/{application_id}/resume/download")
async def download_resume(
    application_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(JobApplication).where(
            JobApplication.id == application_id,
            JobApplication.user_id == current_user.id,
        )
    )
    application = result.scalar_one_or_none()
    if not application or not application.resume_pdf_path:
        raise HTTPException(status_code=404, detail="Resume PDF not found")
    return FileResponse(application.resume_pdf_path, media_type="application/pdf")


@router.get("/{application_id}/cover-letter/download")
async def download_cover_letter(
    application_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(JobApplication).where(
            JobApplication.id == application_id,
            JobApplication.user_id == current_user.id,
        )
    )
    application = result.scalar_one_or_none()
    if not application or not application.cover_letter_pdf_path:
        raise HTTPException(status_code=404, detail="Cover letter PDF not found")
    return FileResponse(application.cover_letter_pdf_path, media_type="application/pdf")
