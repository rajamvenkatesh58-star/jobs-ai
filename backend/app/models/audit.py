import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class AuditLog(Base):
    """
    Immutable append-only log for every LLM call and generated document.
    Rows are never updated or deleted.
    """

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Event taxonomy
    event_type: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )  # e.g. "llm_call", "pdf_generated", "job_ingested", "interview_started"
    entity_type: Mapped[str | None] = mapped_column(String(100))  # "job", "application", "session"
    entity_id: Mapped[str | None] = mapped_column(String(100))

    # LLM call metadata (null for non-LLM events)
    llm_model: Mapped[str | None] = mapped_column(String(100))
    llm_prompt_tokens: Mapped[int | None] = mapped_column(Integer)
    llm_completion_tokens: Mapped[int | None] = mapped_column(Integer)

    # Arbitrary JSON payload (input summary, output summary, error details)
    payload: Mapped[dict | None] = mapped_column(JSONB)

    status: Mapped[str] = mapped_column(String(50), default="success", nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )

    user: Mapped["User"] = relationship("User", back_populates="audit_logs")
