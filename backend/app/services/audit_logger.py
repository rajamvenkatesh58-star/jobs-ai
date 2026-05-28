import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


class AuditLogger:
    def __init__(self, user_id: uuid.UUID | None = None):
        self.user_id = user_id

    async def log(
        self,
        db: AsyncSession,
        event_type: str,
        entity_type: str | None = None,
        entity_id: str | None = None,
        llm_model: str | None = None,
        llm_prompt_tokens: int | None = None,
        llm_completion_tokens: int | None = None,
        payload: dict[str, Any] | None = None,
        status: str = "success",
        error_message: str | None = None,
    ) -> AuditLog:
        entry = AuditLog(
            user_id=self.user_id,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            llm_model=llm_model,
            llm_prompt_tokens=llm_prompt_tokens,
            llm_completion_tokens=llm_completion_tokens,
            payload=payload,
            status=status,
            error_message=error_message,
        )
        db.add(entry)
        await db.flush()
        return entry


def get_audit_logger(user_id: uuid.UUID | None = None) -> AuditLogger:
    return AuditLogger(user_id=user_id)
