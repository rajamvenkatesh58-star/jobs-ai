import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("job_listings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    application_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("job_applications.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Status: question_bank_ready | in_progress | completed | debrief_ready
    status: Mapped[str] = mapped_column(String(50), default="question_bank_ready", nullable=False)

    # JSONB array: [{id, type, question, audio_path, answer_transcript,
    #                star_score, clarity_score, relevance_score, completeness_score,
    #                feedback}]
    question_bank: Mapped[list | None] = mapped_column(JSONB, default=list)

    overall_score: Mapped[int | None] = mapped_column(Integer)  # 0-100
    debrief_report: Mapped[str | None] = mapped_column(Text)
    debrief_pdf_path: Mapped[str | None] = mapped_column(String(1000))

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="interview_sessions")
    job: Mapped["JobListing"] = relationship("JobListing", back_populates="interview_sessions")
