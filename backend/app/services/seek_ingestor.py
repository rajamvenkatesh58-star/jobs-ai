"""
Seek Australia job feed ingestor.

Uses Seek's public RSS feeds — no login, no scraping, no ToS violations.
Public RSS feed format:
  https://www.seek.com.au/api/chalice-search/v4/search?...&format=rss
  or the simpler keyword slug form:
  https://www.seek.com.au/{keyword}-jobs/in-{location}?format=rss

We prefer the query-param form for maximum flexibility.
"""

import hashlib
import logging
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import NamedTuple
from urllib.parse import quote_plus

import feedparser
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.job import JobListing
from app.models.profile import CandidateProfile
from app.services.audit_logger import AuditLogger

logger = logging.getLogger(__name__)

SEEK_RSS_BASE = "https://www.seek.com.au"
# Seek blocks plain requests without a browser UA
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; JobsAI-RSS-Reader/1.0; "
        "+https://github.com/jobs-ai/jobs-ai)"
    ),
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
}
REQUEST_TIMEOUT = 20  # seconds
MAX_FEEDS_PER_RUN = 50  # guard against runaway loops


class ParsedJob(NamedTuple):
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


def _build_feed_urls(profile: CandidateProfile) -> list[str]:
    """
    Construct Seek RSS URLs from the candidate's search preferences.
    Generates one URL per (keyword × location) combination.
    Falls back to a broad Australia-wide feed for each keyword when
    no locations are configured.
    """
    keywords: list[str] = profile.seek_keywords or []
    locations: list[str] = profile.seek_locations or ["All-Australia"]
    categories: list[str] = profile.seek_categories or []

    if not keywords and not categories:
        logger.warning("Profile %s has no seek_keywords or seek_categories configured", profile.id)
        return []

    urls: list[str] = []

    # Keyword × location feeds
    for kw in keywords:
        for loc in locations:
            url = (
                f"{SEEK_RSS_BASE}/jobs"
                f"?keywords={quote_plus(kw)}"
                f"&where={quote_plus(loc)}"
                f"&format=rss"
            )
            urls.append(url)

    # Category-only feeds (no keyword filter)
    for cat in categories:
        for loc in locations:
            url = (
                f"{SEEK_RSS_BASE}/jobs-in-{quote_plus(cat, safe='-')}"
                f"?where={quote_plus(loc)}&format=rss"
            )
            urls.append(url)

    return urls[:MAX_FEEDS_PER_RUN]


def _stable_job_id(entry: feedparser.FeedParserDict) -> str:
    """
    Extract Seek's canonical job ID from the RSS entry.
    Seek includes it as the <id> tag or embeds it in the link URL.
    Falls back to a hash of the URL if neither is present.
    """
    # Seek job IDs appear in links like /job/{id} or as <guid>
    for attr in ("id", "link"):
        val: str = getattr(entry, attr, "") or ""
        match = re.search(r"/job/(\d+)", val)
        if match:
            return match.group(1)

    # Last resort: stable hash of the canonical URL
    url = getattr(entry, "link", "") or ""
    return hashlib.sha256(url.encode()).hexdigest()[:24]


def _parse_published(entry: feedparser.FeedParserDict) -> datetime | None:
    """Parse published date from RSS entry, always returning UTC-aware datetime."""
    # feedparser exposes parsed time as a time.struct_time in .published_parsed
    if getattr(entry, "published_parsed", None):
        import calendar
        ts = calendar.timegm(entry.published_parsed)
        return datetime.fromtimestamp(ts, tz=timezone.utc)

    raw: str = getattr(entry, "published", "") or ""
    if raw:
        try:
            return parsedate_to_datetime(raw).astimezone(timezone.utc)
        except Exception:
            pass
    return None


def _extract_salary(entry: feedparser.FeedParserDict) -> str | None:
    """
    Seek RSS sometimes includes salary in <seek:salary> or the description.
    Parse whichever is available.
    """
    # Namespaced extension tags
    for key in ("seek_salary", "salary"):
        val = getattr(entry, key, None)
        if val:
            return str(val).strip()

    # Fall back: search description text for $xx,xxx patterns
    summary: str = getattr(entry, "summary", "") or ""
    match = re.search(
        r"\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?(?:\s*(?:pa|p\.a\.|per annum|\/hr|hourly))?",
        summary,
        re.IGNORECASE,
    )
    return match.group(0).strip() if match else None


def _parse_entry(entry: feedparser.FeedParserDict) -> ParsedJob:
    title: str = (getattr(entry, "title", "") or "").strip()
    link: str = (getattr(entry, "link", "") or "").strip()
    summary: str = (getattr(entry, "summary", "") or "").strip()

    # Company name is in <author> or <seek:advertiser>
    company: str | None = (
        getattr(entry, "author", None)
        or getattr(entry, "seek_advertiser", None)
    )
    if company:
        company = company.strip() or None

    # Location
    location: str | None = None
    for key in ("seek_location", "location"):
        val = getattr(entry, key, None)
        if val:
            location = str(val).strip()
            break
    if not location:
        # tags list may include location
        for tag in getattr(entry, "tags", []):
            term = getattr(tag, "term", "") or ""
            if re.match(r"[A-Z][a-z]+.*[A-Z]{2,3}", term):
                location = term
                break

    category: str | None = None
    for tag in getattr(entry, "tags", []):
        scheme: str = getattr(tag, "scheme", "") or ""
        if "category" in scheme.lower() or not location or tag.term != location:
            category = getattr(tag, "term", None)
            break

    work_type: str | None = getattr(entry, "seek_worktype", None)
    if work_type:
        work_type = work_type.strip()

    return ParsedJob(
        seek_job_id=_stable_job_id(entry),
        title=title,
        company=company,
        location=location,
        category=category,
        work_type=work_type,
        salary_range=_extract_salary(entry),
        description=summary or None,
        listing_url=link,
        published_at=_parse_published(entry),
    )


async def _fetch_feed(url: str, client: httpx.AsyncClient) -> list[ParsedJob]:
    """Fetch one RSS URL and return parsed job records."""
    try:
        response = await client.get(url, headers=DEFAULT_HEADERS, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.warning("HTTP %s fetching feed %s", exc.response.status_code, url)
        return []
    except httpx.RequestError as exc:
        logger.warning("Request error fetching feed %s: %s", url, exc)
        return []

    feed = feedparser.parse(response.text)
    if feed.bozo:
        logger.debug("feedparser bozo flag for %s: %s", url, feed.bozo_exception)

    jobs: list[ParsedJob] = []
    for entry in feed.entries:
        try:
            jobs.append(_parse_entry(entry))
        except Exception as exc:
            logger.debug("Failed to parse entry from %s: %s", url, exc)

    logger.info("Fetched %d entries from %s", len(jobs), url)
    return jobs


async def _get_existing_ids(db: AsyncSession, ids: list[str]) -> set[str]:
    result = await db.execute(
        select(JobListing.seek_job_id).where(JobListing.seek_job_id.in_(ids))
    )
    return {row[0] for row in result.fetchall()}


async def ingest_for_profile(
    profile: CandidateProfile,
    db: AsyncSession,
    audit: AuditLogger,
) -> dict[str, int]:
    """
    Main entry point.  Fetches all configured Seek RSS feeds for a candidate
    profile, deduplicates against the database, and persists new jobs.

    Returns {"new_jobs": N, "total_fetched": M}.
    """
    feed_urls = _build_feed_urls(profile)
    if not feed_urls:
        return {"new_jobs": 0, "total_fetched": 0}

    all_parsed: list[ParsedJob] = []
    async with httpx.AsyncClient() as client:
        for url in feed_urls:
            parsed = await _fetch_feed(url, client)
            all_parsed.extend(parsed)

    if not all_parsed:
        return {"new_jobs": 0, "total_fetched": 0}

    # Deduplicate within batch (same job_id may appear across feeds)
    seen_in_batch: dict[str, ParsedJob] = {}
    for job in all_parsed:
        if job.seek_job_id not in seen_in_batch:
            seen_in_batch[job.seek_job_id] = job

    unique_parsed = list(seen_in_batch.values())
    all_ids = [j.seek_job_id for j in unique_parsed]

    # Deduplicate against database
    existing_ids = await _get_existing_ids(db, all_ids)
    new_jobs = [j for j in unique_parsed if j.seek_job_id not in existing_ids]

    # Persist
    listings: list[JobListing] = []
    for job in new_jobs:
        listing = JobListing(
            seek_job_id=job.seek_job_id,
            title=job.title,
            company=job.company,
            location=job.location,
            category=job.category,
            work_type=job.work_type,
            salary_range=job.salary_range,
            description=job.description,
            listing_url=job.listing_url,
            published_at=job.published_at,
        )
        db.add(listing)
        listings.append(listing)

    await db.flush()

    await audit.log(
        db=db,
        event_type="job_ingested",
        entity_type="job_listing",
        payload={
            "profile_id": str(profile.id),
            "feed_urls_count": len(feed_urls),
            "total_fetched": len(all_parsed),
            "unique_fetched": len(unique_parsed),
            "new_persisted": len(new_jobs),
        },
    )

    logger.info(
        "Ingestion complete for profile %s: %d new / %d total",
        profile.id,
        len(new_jobs),
        len(all_parsed),
    )

    return {"new_jobs": len(new_jobs), "total_fetched": len(all_parsed)}


async def ingest_for_user(
    user_id: str,
    db: AsyncSession,
    audit: AuditLogger,
) -> dict[str, int]:
    """Convenience wrapper — looks up the profile then delegates."""
    from uuid import UUID

    result = await db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == UUID(user_id))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise ValueError(f"No profile found for user {user_id}")

    return await ingest_for_profile(profile, db, audit)
