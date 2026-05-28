"""
Celery background tasks.

The scheduler runs `ingest_all_profiles` on a configurable beat schedule
(see docker-compose.yml celerybeat command).
"""

import asyncio
import logging

from celery import Celery
from sqlalchemy import select

from app.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.profile import CandidateProfile
from app.services.audit_logger import AuditLogger
from app.services.job_scorer import score_job
from app.services.seek_ingestor import ingest_for_profile

settings = get_settings()
logger = logging.getLogger(__name__)

celery_app = Celery(
    "jobs_ai",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Australia/Melbourne",
    enable_utc=True,
    beat_schedule={
        "ingest-seek-feeds-every-hour": {
            "task": "app.workers.tasks.ingest_all_profiles",
            "schedule": 3600.0,  # every hour
        },
        "score-unscored-jobs-every-30min": {
            "task": "app.workers.tasks.score_unscored_jobs",
            "schedule": 1800.0,
        },
    },
)


def _run(coro):
    """Run an async coroutine from a sync Celery task."""
    return asyncio.get_event_loop().run_until_complete(coro)


@celery_app.task(name="app.workers.tasks.ingest_all_profiles", bind=True, max_retries=3)
def ingest_all_profiles(self):
    """Fetch Seek RSS feeds for every active candidate profile."""

    async def _inner():
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(CandidateProfile))
            profiles = result.scalars().all()
            total_new = 0
            for profile in profiles:
                try:
                    audit = AuditLogger(user_id=profile.user_id)
                    counts = await ingest_for_profile(profile, db, audit)
                    total_new += counts["new_jobs"]
                except Exception as exc:
                    logger.error("Ingest failed for profile %s: %s", profile.id, exc)
            logger.info("Scheduled ingest complete: %d new jobs across %d profiles", total_new, len(profiles))
            return total_new

    try:
        return _run(_inner())
    except Exception as exc:
        logger.error("ingest_all_profiles task failed: %s", exc)
        raise self.retry(exc=exc, countdown=300)


@celery_app.task(name="app.workers.tasks.score_unscored_jobs", bind=True, max_retries=3)
def score_unscored_jobs(self):
    """Score any job listings that haven't been scored for each profile."""

    from app.models.job import JobListing

    async def _inner():
        async with AsyncSessionLocal() as db:
            profiles_result = await db.execute(select(CandidateProfile))
            profiles = profiles_result.scalars().all()

            jobs_result = await db.execute(select(JobListing).limit(500))
            jobs = jobs_result.scalars().all()

            scored = 0
            for profile in profiles:
                user_key = str(profile.user_id)
                for job in jobs:
                    if user_key not in (job.score_results or {}):
                        threshold = profile.min_score_threshold or 0
                        try:
                            audit = AuditLogger(user_id=profile.user_id)
                            score, _ = await score_job(job, profile, db, audit)
                            scored += 1
                        except Exception as exc:
                            logger.error("Scoring failed job %s / profile %s: %s", job.id, profile.id, exc)
            logger.info("Scored %d job/profile pairs", scored)
            return scored

    try:
        return _run(_inner())
    except Exception as exc:
        logger.error("score_unscored_jobs task failed: %s", exc)
        raise self.retry(exc=exc, countdown=120)
