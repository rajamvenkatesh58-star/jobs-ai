import asyncio
import base64
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import get_current_user
from app.db.session import get_db
from app.models.interview import InterviewSession
from app.models.job import JobListing
from app.models.profile import CandidateProfile
from app.models.user import User
from app.schemas.interview import (
    AnswerResult,
    InterviewSessionCreate,
    InterviewSessionRead,
    QuestionAnswer,
)
from app.services.audit_logger import AuditLogger
from app.services.interview_coach import (
    generate_debrief,
    generate_question_bank,
    judge_answer,
    synthesise_question_audio,
    transcribe_audio,
)
from app.services.pdf_builder import build_pdf

router = APIRouter(prefix="/interview", tags=["interview"])


@router.post("/sessions", response_model=InterviewSessionRead, status_code=201)
async def create_session(
    payload: InterviewSessionCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Generate question bank and create a new interview session."""
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
    questions = await generate_question_bank(job, profile, db, audit)

    session = InterviewSession(
        user_id=current_user.id,
        job_id=job.id,
        status="question_bank_ready",
        question_bank=questions,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/sessions", response_model=list[InterviewSessionRead])
async def list_sessions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.created_at.desc())
    )
    return result.scalars().all()


@router.get("/sessions/{session_id}", response_model=InterviewSessionRead)
async def get_session(
    session_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.id == session_id,
            InterviewSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/sessions/{session_id}/start", response_model=InterviewSessionRead)
async def start_session(
    session_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.id == session_id,
            InterviewSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status not in ("question_bank_ready",):
        raise HTTPException(status_code=409, detail=f"Session already {session.status}")

    session.status = "in_progress"
    session.started_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/sessions/{session_id}/questions/{question_id}/audio")
async def get_question_audio(
    session_id: uuid.UUID,
    question_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Stream synthesised TTS audio (MP3) for a question."""
    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.id == session_id,
            InterviewSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    question = next(
        (q for q in (session.question_bank or []) if q["id"] == question_id), None
    )
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    audio_bytes = await synthesise_question_audio(question["question"])
    return Response(content=audio_bytes, media_type="audio/mpeg")


@router.post("/sessions/{session_id}/answers", response_model=AnswerResult)
async def submit_answer(
    session_id: uuid.UUID,
    payload: QuestionAnswer,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Accept base64 WAV audio, transcribe with Whisper, judge with LLM."""
    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.id == session_id,
            InterviewSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != "in_progress":
        raise HTTPException(status_code=409, detail="Session is not in progress")

    question = next(
        (q for q in (session.question_bank or []) if q["id"] == payload.question_id), None
    )
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    audit = AuditLogger(user_id=current_user.id)

    # STT — runs in a thread pool to avoid blocking the event loop
    loop = asyncio.get_event_loop()
    transcript = await loop.run_in_executor(None, transcribe_audio, payload.audio_data_b64)

    scores = await judge_answer(question["question"], transcript, db, audit)

    # Persist scores back into the JSONB question_bank entry
    bank = list(session.question_bank or [])
    for q in bank:
        if q["id"] == payload.question_id:
            q["answer_transcript"] = transcript
            q["star_score"] = scores["star_score"]
            q["clarity_score"] = scores["clarity_score"]
            q["relevance_score"] = scores["relevance_score"]
            q["completeness_score"] = scores["completeness_score"]
            q["feedback"] = scores["feedback"]
            break
    session.question_bank = bank

    await db.commit()

    return AnswerResult(
        question_id=payload.question_id,
        transcript=transcript,
        **scores,
    )


@router.post("/sessions/{session_id}/complete", response_model=InterviewSessionRead)
async def complete_session(
    session_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Finalise session, compute overall score, generate debrief PDF."""
    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.id == session_id,
            InterviewSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != "in_progress":
        raise HTTPException(status_code=409, detail="Session is not in progress")

    answered = [
        q for q in (session.question_bank or []) if q.get("star_score") is not None
    ]
    if answered:
        avg = sum(
            (q["star_score"] + q["clarity_score"] + q["relevance_score"] + q["completeness_score"])
            / 4
            for q in answered
        ) / len(answered)
        session.overall_score = round(avg)

    session.status = "completed"
    session.completed_at = datetime.now(timezone.utc)
    await db.flush()

    audit = AuditLogger(user_id=current_user.id)
    debrief_html = await generate_debrief(session, db, audit)
    session.debrief_report = debrief_html

    debrief_path = await build_pdf(
        debrief_html,
        current_user.id,
        "interview_debrief",
        f"session_{str(session_id)[:8]}",
        db,
        audit,
    )
    session.debrief_pdf_path = debrief_path
    session.status = "debrief_ready"

    await db.commit()
    await db.refresh(session)
    return session


@router.get("/sessions/{session_id}/debrief/download")
async def download_debrief(
    session_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.id == session_id,
            InterviewSession.user_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session or not session.debrief_pdf_path:
        raise HTTPException(status_code=404, detail="Debrief PDF not found")
    return FileResponse(session.debrief_pdf_path, media_type="application/pdf")
