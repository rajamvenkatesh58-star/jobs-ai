"""
Score a job listing against a candidate profile using grok-3-mini.
Returns a 0-100 integer score and a plain-text reasoning paragraph.
"""

import json
import logging

from openai import AsyncOpenAI

from app.config import get_settings
from app.models.job import JobListing
from app.models.profile import CandidateProfile
from app.services.audit_logger import AuditLogger
from app.db.session import AsyncSession

logger = logging.getLogger(__name__)
settings = get_settings()

_client = AsyncOpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1")
SCORER_MODEL = "llama-3.1-8b-instant"


def _profile_summary(profile: CandidateProfile) -> str:
    skills = ", ".join(profile.technical_skills or [])
    titles = ", ".join(profile.desired_job_titles or [])
    locations = ", ".join(profile.desired_locations or [])
    salary_min = profile.salary_min_aud or 0
    salary_max = profile.salary_max_aud or 0

    experience_lines = []
    for exp in (profile.work_experience or []):
        end = exp.get("end_date") or "present"
        tech = ", ".join(exp.get("technologies", []))
        experience_lines.append(
            f"  - {exp.get('role')} at {exp.get('company')} "
            f"({exp.get('start_date')}–{end}). Tech: {tech}"
        )

    edu_lines = []
    for edu in (profile.education or []):
        edu_lines.append(
            f"  - {edu.get('degree')} in {edu.get('field_of_study')} "
            f"from {edu.get('institution')} ({edu.get('graduation_year')})"
        )

    return f"""CANDIDATE PROFILE:
Desired titles: {titles}
Desired locations: {locations}
Salary expectation (AUD): {salary_min}–{salary_max}
Technical skills: {skills}
Work type preference: {profile.work_type or 'any'}

Work experience:
{chr(10).join(experience_lines) or '  (none provided)'}

Education:
{chr(10).join(edu_lines) or '  (none provided)'}
"""


_SYSTEM_PROMPT = """\
You are an expert recruitment consultant for the Australian job market.
Score how well the job listing matches the candidate profile.

Respond with a valid JSON object ONLY (no markdown fences, no commentary):
{
  "score": <integer 0-100>,
  "reasoning": "<2-3 sentences explaining the score>"
}

Scoring rubric:
- 90-100: Near-perfect match — skills, location, seniority, salary all align
- 70-89:  Strong match with minor gaps
- 50-69:  Partial match — meaningful skill overlap but notable mismatches
- 30-49:  Weak match — a few overlapping points but significant gaps
- 0-29:   Poor match — candidate is unlikely to be considered
"""


async def score_job(
    job: JobListing,
    profile: CandidateProfile,
    db: AsyncSession,
    audit: AuditLogger,
) -> tuple[int, str]:
    """
    Returns (score: int, reasoning: str).
    Caches result in job.score_results[str(profile.user_id)].
    """
    user_key = str(profile.user_id)
    cached = (job.score_results or {}).get(user_key)
    if cached:
        return cached["score"], cached["reasoning"]

    user_message = f"""{_profile_summary(profile)}

JOB LISTING:
Title: {job.title}
Company: {job.company or 'Undisclosed'}
Location: {job.location or 'Not specified'}
Work type: {job.work_type or 'Not specified'}
Salary: {job.salary_range or 'Not specified'}
Category: {job.category or 'Not specified'}

Description:
{(job.description or '')[:3000]}
"""

    try:
        response = await _client.chat.completions.create(
            model=SCORER_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0,
            max_tokens=300,
        )
    except Exception as exc:
        logger.error("LLM call failed for scoring job %s: %s", job.id, exc)
        await audit.log(
            db=db,
            event_type="llm_call",
            entity_type="job_listing",
            entity_id=str(job.id),
            llm_model=SCORER_MODEL,
            status="error",
            error_message=str(exc),
        )
        raise

    choice = response.choices[0]
    raw = choice.message.content.strip()
    usage = response.usage

    await audit.log(
        db=db,
        event_type="llm_call",
        entity_type="job_listing",
        entity_id=str(job.id),
        llm_model=SCORER_MODEL,
        llm_prompt_tokens=usage.prompt_tokens if usage else None,
        llm_completion_tokens=usage.completion_tokens if usage else None,
        payload={"action": "score_job", "job_title": job.title},
    )

    try:
        data = json.loads(raw)
        score = max(0, min(100, int(data["score"])))
        reasoning: str = str(data["reasoning"])
    except Exception as exc:
        logger.error("Failed to parse scorer response for job %s: %s\nRaw: %s", job.id, exc, raw)
        score, reasoning = 0, "Scoring failed — could not parse LLM response."

    # Persist in the JSONB column
    results = dict(job.score_results or {})
    results[user_key] = {"score": score, "reasoning": reasoning}
    job.score_results = results

    return score, reasoning
