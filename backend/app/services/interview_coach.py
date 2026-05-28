"""
AI Interview Coach — question bank generation, TTS, STT, and answer judging.

TTS:  edge-tts (Microsoft Edge voices, no API key)
STT:  openai-whisper (runs locally, no API key)
LLM:  grok-3 via xAI API
"""

import asyncio
import base64
import io
import json
import logging
import os
import tempfile
import uuid
from datetime import datetime, timezone
from typing import Any

import edge_tts
import numpy as np
import whisper

from openai import AsyncOpenAI

from app.config import get_settings
from app.db.session import AsyncSession
from app.models.interview import InterviewSession
from app.models.job import JobListing
from app.models.profile import CandidateProfile
from app.services.audit_logger import AuditLogger

logger = logging.getLogger(__name__)
settings = get_settings()

_client = AsyncOpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1")
COACH_MODEL = "llama-3.3-70b-versatile"

EDGE_TTS_VOICE = "en-AU-NatashaNeural"  # Australian English female voice

# Whisper model loaded once at startup (lazy)
_whisper_model: whisper.Whisper | None = None


def _get_whisper() -> whisper.Whisper:
    global _whisper_model
    if _whisper_model is None:
        logger.info("Loading Whisper model (base.en) — first call only")
        _whisper_model = whisper.load_model("base.en")
    return _whisper_model


_QB_SYSTEM = """\
You are an expert interview coach specialised in the Australian job market.
Generate a targeted question bank for a mock interview.

Respond with valid JSON only (no markdown fences):
{
  "questions": [
    {
      "id": "q1",
      "type": "behavioural|technical|company",
      "question": "...",
      "guidance": "What the interviewer wants to hear (1 sentence)"
    }
  ]
}

Include:
- 5 behavioural STAR questions tailored to the role's key responsibilities
- 4 technical questions based on the required skills in the job description
- 2 company/culture questions

Total: 11 questions, ordered as listed above.
"""

_JUDGE_SYSTEM = """\
You are a strict but fair interview coach judging a candidate's spoken answer.

Score each dimension 0-100:
- star_score: How well the answer follows the STAR framework (Situation, Task, Action, Result)
- clarity_score: How clearly and concisely the answer is communicated
- relevance_score: How relevant the answer is to the specific question asked
- completeness_score: Whether all parts of STAR were adequately addressed

Respond with valid JSON only:
{
  "star_score": <int>,
  "clarity_score": <int>,
  "relevance_score": <int>,
  "completeness_score": <int>,
  "feedback": "<2-3 sentences of specific, actionable feedback>"
}
"""

_DEBRIEF_SYSTEM = """\
You are an expert interview coach writing a post-interview debrief report.
Write in professional Australian English.
Structure: Executive Summary → Strengths → Areas for Improvement →
           Per-Question Analysis → Action Plan (3 specific steps).
Use clear HTML suitable for WeasyPrint PDF conversion.
Maximum 800 words.
"""


async def generate_question_bank(
    job: JobListing,
    profile: CandidateProfile,
    db: AsyncSession,
    audit: AuditLogger,
) -> list[dict[str, Any]]:
    skills = ", ".join(profile.technical_skills or [])
    user_msg = (
        f"Job Title: {job.title}\n"
        f"Company: {job.company or 'Undisclosed'}\n"
        f"Candidate skills: {skills}\n\n"
        f"Job description:\n{(job.description or '')[:3000]}"
    )

    response = await _client.chat.completions.create(
        model=COACH_MODEL,
        messages=[
            {"role": "system", "content": _QB_SYSTEM},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.5,
        max_tokens=2000,
    )
    usage = response.usage
    raw = response.choices[0].message.content.strip()

    await audit.log(
        db=db,
        event_type="llm_call",
        entity_type="interview_session",
        llm_model=COACH_MODEL,
        llm_prompt_tokens=usage.prompt_tokens if usage else None,
        llm_completion_tokens=usage.completion_tokens if usage else None,
        payload={"action": "generate_question_bank", "job_title": job.title},
    )

    data = json.loads(raw)
    return data["questions"]


async def synthesise_question_audio(question_text: str) -> bytes:
    """
    Synthesise question audio using edge-tts and return raw MP3 bytes.
    """
    communicate = edge_tts.Communicate(question_text, EDGE_TTS_VOICE)
    mp3_chunks: list[bytes] = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            mp3_chunks.append(chunk["data"])
    return b"".join(mp3_chunks)


def transcribe_audio(audio_b64: str) -> str:
    """
    Transcribe base64-encoded WAV audio using local Whisper model.
    Returns the transcript string.
    """
    audio_bytes = base64.b64decode(audio_b64)
    model = _get_whisper()

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        result = model.transcribe(tmp_path, language="en", fp16=False)
        return result["text"].strip()
    finally:
        os.unlink(tmp_path)


async def judge_answer(
    question: str,
    transcript: str,
    db: AsyncSession,
    audit: AuditLogger,
) -> dict[str, Any]:
    response = await _client.chat.completions.create(
        model=COACH_MODEL,
        messages=[
            {"role": "system", "content": _JUDGE_SYSTEM},
            {
                "role": "user",
                "content": (
                    f"QUESTION: {question}\n\n"
                    f"CANDIDATE ANSWER (transcribed):\n{transcript}"
                ),
            },
        ],
        temperature=0,
        max_tokens=500,
    )
    usage = response.usage
    raw = response.choices[0].message.content.strip()

    await audit.log(
        db=db,
        event_type="llm_call",
        entity_type="interview_session",
        llm_model=COACH_MODEL,
        llm_prompt_tokens=usage.prompt_tokens if usage else None,
        llm_completion_tokens=usage.completion_tokens if usage else None,
        payload={"action": "judge_answer"},
    )

    return json.loads(raw)


async def generate_debrief(
    session: InterviewSession,
    db: AsyncSession,
    audit: AuditLogger,
) -> str:
    """Generate full HTML debrief report. Returns HTML string."""
    questions_summary = json.dumps(session.question_bank, indent=2)

    response = await _client.chat.completions.create(
        model=COACH_MODEL,
        messages=[
            {"role": "system", "content": _DEBRIEF_SYSTEM},
            {
                "role": "user",
                "content": (
                    f"Overall session score: {session.overall_score}/100\n\n"
                    f"Question bank with scores and answers:\n{questions_summary}"
                ),
            },
        ],
        temperature=0.4,
        max_tokens=3000,
    )
    usage = response.usage
    html = response.choices[0].message.content.strip()

    await audit.log(
        db=db,
        event_type="llm_call",
        entity_type="interview_session",
        entity_id=str(session.id),
        llm_model=COACH_MODEL,
        llm_prompt_tokens=usage.prompt_tokens if usage else None,
        llm_completion_tokens=usage.completion_tokens if usage else None,
        payload={"action": "generate_debrief", "overall_score": session.overall_score},
    )

    return html
