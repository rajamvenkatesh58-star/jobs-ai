import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class CandidateProfile(Base):
    """
    Complete candidate profile.  All resume generation is driven from
    these verified fields — nothing is invented by the LLM.
    """

    __tablename__ = "candidate_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    # ── Personal ──────────────────────────────────────────────────────────
    phone: Mapped[str | None] = mapped_column(String(50))
    location_suburb: Mapped[str | None] = mapped_column(String(100))
    location_state: Mapped[str | None] = mapped_column(String(50))
    linkedin_url: Mapped[str | None] = mapped_column(String(500))
    github_url: Mapped[str | None] = mapped_column(String(500))
    portfolio_url: Mapped[str | None] = mapped_column(String(500))
    professional_summary: Mapped[str | None] = mapped_column(Text)

    # ── Work experience ───────────────────────────────────────────────────
    # JSONB array: [{company, role, start_date, end_date|null, location,
    #                achievements: [str], technologies: [str]}]
    work_experience: Mapped[list | None] = mapped_column(JSONB, default=list)

    # ── Education ─────────────────────────────────────────────────────────
    # JSONB array: [{institution, degree, field_of_study,
    #                graduation_year, gpa|null}]
    education: Mapped[list | None] = mapped_column(JSONB, default=list)

    # ── Skills ───────────────────────────────────────────────────────────
    technical_skills: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    certifications: Mapped[list | None] = mapped_column(
        JSONB, default=list
    )  # [{name, issuer, year, url|null}]
    languages: Mapped[list | None] = mapped_column(
        JSONB, default=list
    )  # [{language, proficiency}]

    # ── Career preferences ────────────────────────────────────────────────
    desired_job_titles: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    desired_locations: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    salary_min_aud: Mapped[int | None] = mapped_column(Integer)
    salary_max_aud: Mapped[int | None] = mapped_column(Integer)
    work_type: Mapped[str | None] = mapped_column(
        String(50)
    )  # full-time, part-time, contract, casual

    # ── Seek job feed settings ────────────────────────────────────────────
    seek_keywords: Mapped[list[str] | None] = mapped_column(
        ARRAY(String)
    )  # search terms to monitor
    seek_locations: Mapped[list[str] | None] = mapped_column(
        ARRAY(String)
    )  # Seek location slugs e.g. "Melbourne-VIC-3000"
    seek_categories: Mapped[list[str] | None] = mapped_column(
        ARRAY(String)
    )  # Seek category slugs
    min_score_threshold: Mapped[int | None] = mapped_column(
        Integer, default=70
    )  # 0-100; only queue jobs above this

    # ── Scoring weights (user-tunable) ────────────────────────────────────
    # JSONB: {skills_match: float, experience_level: float,
    #          location: float, salary: float}
    scoring_weights: Mapped[dict | None] = mapped_column(
        JSONB,
        default=lambda: {
            "skills_match": 0.40,
            "experience_level": 0.25,
            "location": 0.20,
            "salary": 0.15,
        },
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="profile")
