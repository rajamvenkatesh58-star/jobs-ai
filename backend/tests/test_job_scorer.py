import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.job import JobListing
from app.models.profile import CandidateProfile
from app.services.audit_logger import AuditLogger
from app.services.job_scorer import score_job


@pytest.fixture
def sample_job():
    return JobListing(
        id=uuid.uuid4(),
        seek_job_id="test-001",
        title="Senior Python Developer",
        company="Acme Corp",
        location="Melbourne VIC",
        category="Information Technology",
        work_type="Full Time",
        salary_range="$120,000 - $140,000",
        description="We need a Python developer with FastAPI, PostgreSQL, and Docker.",
        listing_url="https://www.seek.com.au/job/test-001",
        score_results={},
    )


@pytest.fixture
def sample_profile():
    uid = uuid.uuid4()
    return CandidateProfile(
        id=uuid.uuid4(),
        user_id=uid,
        technical_skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
        desired_job_titles=["Senior Python Developer", "Backend Engineer"],
        desired_locations=["Melbourne"],
        salary_min_aud=110000,
        salary_max_aud=150000,
        work_type="full-time",
        work_experience=[
            {
                "company": "Previous Corp",
                "role": "Python Developer",
                "start_date": "2020-01",
                "end_date": "2024-01",
                "achievements": ["Built REST APIs", "Reduced latency by 40%"],
                "technologies": ["Python", "FastAPI", "PostgreSQL"],
            }
        ],
        education=[
            {
                "institution": "University of Melbourne",
                "degree": "Bachelor of Computer Science",
                "field_of_study": "Computer Science",
                "graduation_year": 2019,
            }
        ],
    )


@pytest.mark.asyncio
async def test_score_job_calls_llm_and_returns_score(sample_job, sample_profile, db_session):
    mock_choice = MagicMock()
    mock_choice.message.content = '{"score": 85, "reasoning": "Strong skills match."}'

    mock_usage = MagicMock()
    mock_usage.prompt_tokens = 500
    mock_usage.completion_tokens = 50

    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.usage = mock_usage

    mock_create = AsyncMock(return_value=mock_response)

    audit = AuditLogger(user_id=sample_profile.user_id)

    with patch("app.services.job_scorer._client") as mock_client:
        mock_client.chat.completions.create = mock_create
        score, reasoning = await score_job(sample_job, sample_profile, db_session, audit)

    assert score == 85
    assert "Strong skills match" in reasoning


@pytest.mark.asyncio
async def test_score_job_caches_result(sample_job, sample_profile, db_session):
    user_key = str(sample_profile.user_id)
    sample_job.score_results = {user_key: {"score": 72, "reasoning": "Cached result."}}

    audit = AuditLogger(user_id=sample_profile.user_id)

    with patch("app.services.job_scorer._client") as mock_client:
        mock_client.chat.completions.create = AsyncMock()
        score, reasoning = await score_job(sample_job, sample_profile, db_session, audit)

    assert score == 72
    assert reasoning == "Cached result."
    mock_client.chat.completions.create.assert_not_called()


@pytest.mark.asyncio
async def test_score_clamped_to_0_100(sample_job, sample_profile, db_session):
    mock_choice = MagicMock()
    mock_choice.message.content = '{"score": 150, "reasoning": "Out of bounds score."}'
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.usage = MagicMock(prompt_tokens=100, completion_tokens=20)

    audit = AuditLogger(user_id=sample_profile.user_id)

    with patch("app.services.job_scorer._client") as mock_client:
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        score, _ = await score_job(sample_job, sample_profile, db_session, audit)

    assert score == 100
