"""
Generate tailored resume and cover letter content using grok-3.

STRICT RULE: The LLM may only reorder, rephrase, and emphasise content
that already exists in the candidate profile.  It must never invent
experience, skills, qualifications, or any other factual claims.
"""

import logging
from datetime import datetime, timezone

from openai import AsyncOpenAI

from app.config import get_settings
from app.models.job import JobListing
from app.models.profile import CandidateProfile
from app.models.user import User
from app.services.audit_logger import AuditLogger
from app.db.session import AsyncSession

logger = logging.getLogger(__name__)
settings = get_settings()

_client = AsyncOpenAI(api_key=settings.groq_api_key, base_url="https://api.groq.com/openai/v1")
GENERATOR_MODEL = "llama-3.3-70b-versatile"


_RESUME_SYSTEM = """\
You are a professional resume writer for the Australian job market.

CRITICAL RULES — violation is grounds for immediate rejection:
1. You must ONLY use information explicitly provided in the candidate profile.
2. You must NEVER invent, embellish, or imply skills, achievements, or experience
   that are not stated in the profile.
3. You must NEVER add companies, degrees, projects, or certifications not listed.
4. You may rephrase, reorder, and emphasise existing content to match the job.
5. Output clean HTML suitable for WeasyPrint PDF conversion — no JavaScript,
   no external resources, use only inline or <style> CSS.

Structure: Professional Summary → Work Experience → Education → Skills → Certifications
"""

_COVER_LETTER_SYSTEM = """\
You are a professional cover letter writer for the Australian job market.

CRITICAL RULES:
1. Only reference skills and experience that are explicitly in the candidate profile.
2. Never invent achievements, metrics, or experience.
3. Write in a professional Australian English tone (not overly formal, not casual).
4. Output HTML suitable for WeasyPrint PDF conversion.
5. Length: 3 paragraphs, max 350 words.
"""


def _profile_to_text(profile: CandidateProfile, user: User) -> str:
    skills = ", ".join(profile.technical_skills or [])
    certs = "; ".join(
        f"{c.get('name')} ({c.get('issuer')}, {c.get('year')})"
        for c in (profile.certifications or [])
    )

    exp_blocks = []
    for exp in (profile.work_experience or []):
        end = exp.get("end_date") or "present"
        achievements = "\n".join(f"    • {a}" for a in exp.get("achievements", []))
        tech = ", ".join(exp.get("technologies", []))
        exp_blocks.append(
            f"  {exp.get('role')} | {exp.get('company')} | "
            f"{exp.get('location', '')} | {exp.get('start_date')}–{end}\n"
            f"  Technologies: {tech}\n"
            f"  Achievements:\n{achievements}"
        )

    edu_blocks = []
    for edu in (profile.education or []):
        gpa_str = f", GPA {edu.get('gpa')}" if edu.get("gpa") else ""
        edu_blocks.append(
            f"  {edu.get('degree')} in {edu.get('field_of_study')} | "
            f"{edu.get('institution')} | {edu.get('graduation_year')}{gpa_str}"
        )

    return f"""CANDIDATE: {user.full_name}
Email: {user.email}
Phone: {profile.phone or ''}
Location: {profile.location_suburb or ''}, {profile.location_state or ''}
LinkedIn: {profile.linkedin_url or ''}
GitHub: {profile.github_url or ''}
Portfolio: {profile.portfolio_url or ''}

PROFESSIONAL SUMMARY:
{profile.professional_summary or ''}

WORK EXPERIENCE:
{chr(10).join(exp_blocks) or '  None provided'}

EDUCATION:
{chr(10).join(edu_blocks) or '  None provided'}

TECHNICAL SKILLS: {skills}

CERTIFICATIONS: {certs or 'None'}
"""


async def generate_resume_html(
    user: User,
    profile: CandidateProfile,
    job: JobListing,
    db: AsyncSession,
    audit: AuditLogger,
) -> str:
    profile_text = _profile_to_text(profile, user)
    job_text = (
        f"Job Title: {job.title}\n"
        f"Company: {job.company or 'Undisclosed'}\n"
        f"Location: {job.location or 'Not specified'}\n"
        f"Description:\n{(job.description or '')[:4000]}"
    )

    response = await _client.chat.completions.create(
        model=GENERATOR_MODEL,
        messages=[
            {"role": "system", "content": _RESUME_SYSTEM},
            {
                "role": "user",
                "content": (
                    f"Generate a tailored resume HTML for this job.\n\n"
                    f"=== CANDIDATE PROFILE ===\n{profile_text}\n\n"
                    f"=== TARGET JOB ===\n{job_text}"
                ),
            },
        ],
        temperature=0.3,
        max_tokens=4000,
    )
    usage = response.usage
    html = response.choices[0].message.content.strip()

    await audit.log(
        db=db,
        event_type="llm_call",
        entity_type="job_application",
        entity_id=str(job.id),
        llm_model=GENERATOR_MODEL,
        llm_prompt_tokens=usage.prompt_tokens if usage else None,
        llm_completion_tokens=usage.completion_tokens if usage else None,
        payload={"action": "generate_resume", "job_title": job.title},
    )

    return html


async def generate_cover_letter_html(
    user: User,
    profile: CandidateProfile,
    job: JobListing,
    db: AsyncSession,
    audit: AuditLogger,
) -> str:
    profile_text = _profile_to_text(profile, user)
    today = datetime.now(timezone.utc).strftime("%d %B %Y")

    response = await _client.chat.completions.create(
        model=GENERATOR_MODEL,
        messages=[
            {"role": "system", "content": _COVER_LETTER_SYSTEM},
            {
                "role": "user",
                "content": (
                    f"Date: {today}\n"
                    f"Generate a tailored cover letter HTML.\n\n"
                    f"=== CANDIDATE PROFILE ===\n{profile_text}\n\n"
                    f"=== TARGET JOB ===\n"
                    f"Title: {job.title}\n"
                    f"Company: {job.company or 'Hiring Manager'}\n"
                    f"Description:\n{(job.description or '')[:2000]}"
                ),
            },
        ],
        temperature=0.4,
        max_tokens=1500,
    )
    usage = response.usage
    html = response.choices[0].message.content.strip()

    await audit.log(
        db=db,
        event_type="llm_call",
        entity_type="job_application",
        entity_id=str(job.id),
        llm_model=GENERATOR_MODEL,
        llm_prompt_tokens=usage.prompt_tokens if usage else None,
        llm_completion_tokens=usage.completion_tokens if usage else None,
        payload={"action": "generate_cover_letter", "job_title": job.title},
    )

    return html
