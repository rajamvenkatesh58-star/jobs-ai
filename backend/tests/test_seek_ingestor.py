"""
Tests for seek_ingestor.py.

Network calls are mocked — tests run without an internet connection.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import feedparser
import pytest
import pytest_asyncio

from app.models.profile import CandidateProfile
from app.services.audit_logger import AuditLogger
from app.services.seek_ingestor import (
    _build_feed_urls,
    _extract_salary,
    _parse_entry,
    _stable_job_id,
    ingest_for_profile,
)

SAMPLE_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Seek Jobs</title>
    <item>
      <title>Senior Python Developer</title>
      <link>https://www.seek.com.au/job/12345678</link>
      <guid>https://www.seek.com.au/job/12345678</guid>
      <author>Acme Corp</author>
      <description>We are looking for a Python developer with FastAPI experience.
        Salary: $120,000 - $140,000 pa. Full-time role in Melbourne CBD.</description>
      <pubDate>Thu, 28 May 2026 09:00:00 +1000</pubDate>
    </item>
    <item>
      <title>DevOps Engineer</title>
      <link>https://www.seek.com.au/job/87654321</link>
      <guid>https://www.seek.com.au/job/87654321</guid>
      <author>Beta Ltd</author>
      <description>DevOps role requiring Kubernetes and Terraform skills.</description>
      <pubDate>Wed, 27 May 2026 14:30:00 +1000</pubDate>
    </item>
  </channel>
</rss>"""


@pytest.fixture
def sample_profile():
    return CandidateProfile(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        seek_keywords=["python developer", "software engineer"],
        seek_locations=["Melbourne-VIC-3000"],
        seek_categories=[],
        min_score_threshold=60,
    )


# ── URL builder ──────────────────────────────────────────────────────────────

def test_build_feed_urls_keyword_x_location(sample_profile):
    urls = _build_feed_urls(sample_profile)
    assert len(urls) == 2  # 2 keywords × 1 location
    assert all("format=rss" in u for u in urls)
    assert any("python+developer" in u or "python%20developer" in u for u in urls)


def test_build_feed_urls_no_keywords_returns_empty():
    profile = CandidateProfile(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        seek_keywords=[],
        seek_categories=[],
    )
    assert _build_feed_urls(profile) == []


def test_build_feed_urls_category_only():
    profile = CandidateProfile(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        seek_keywords=[],
        seek_categories=["information-technology"],
        seek_locations=["Sydney-NSW-2000"],
    )
    urls = _build_feed_urls(profile)
    assert len(urls) == 1
    assert "information-technology" in urls[0]


# ── Entry parsing ─────────────────────────────────────────────────────────────

def test_stable_job_id_extracts_from_link():
    entry = MagicMock()
    entry.id = "https://www.seek.com.au/job/12345678"
    entry.link = "https://www.seek.com.au/job/12345678"
    assert _stable_job_id(entry) == "12345678"


def test_stable_job_id_falls_back_to_hash():
    entry = MagicMock()
    entry.id = "no-job-id-here"
    entry.link = "https://example.com/no-id"
    result = _stable_job_id(entry)
    assert len(result) == 24  # sha256 hex truncated


def test_extract_salary_from_description():
    entry = MagicMock(spec=[])
    entry.seek_salary = None
    entry.salary = None
    entry.summary = "Competitive salary $120,000 - $140,000 pa depending on experience."
    salary = _extract_salary(entry)
    assert salary is not None
    assert "120,000" in salary


def test_parse_entry_full():
    feed = feedparser.parse(SAMPLE_RSS)
    entry = feed.entries[0]
    job = _parse_entry(entry)

    assert job.seek_job_id == "12345678"
    assert job.title == "Senior Python Developer"
    assert job.listing_url == "https://www.seek.com.au/job/12345678"
    assert job.published_at is not None
    assert "Python" in (job.description or "")


# ── Integration: ingest_for_profile ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_ingest_stores_new_jobs(sample_profile, db_session):
    audit = AuditLogger(user_id=sample_profile.user_id)

    mock_response = MagicMock()
    mock_response.text = SAMPLE_RSS
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.seek_ingestor.httpx.AsyncClient", return_value=mock_client):
        result = await ingest_for_profile(sample_profile, db_session, audit)

    assert result["total_fetched"] >= 2
    assert result["new_jobs"] >= 2


@pytest.mark.asyncio
async def test_ingest_deduplicates_on_second_run(sample_profile, db_session):
    audit = AuditLogger(user_id=sample_profile.user_id)

    mock_response = MagicMock()
    mock_response.text = SAMPLE_RSS
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.seek_ingestor.httpx.AsyncClient", return_value=mock_client):
        first = await ingest_for_profile(sample_profile, db_session, audit)
        second = await ingest_for_profile(sample_profile, db_session, audit)

    assert second["new_jobs"] == 0
    assert second["total_fetched"] >= 2
