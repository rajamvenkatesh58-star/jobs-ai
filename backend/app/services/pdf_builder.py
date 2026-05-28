"""
Build PDF files from HTML strings using WeasyPrint.
PDFs are saved to the local filesystem under /data/pdfs/{user_id}/.
In production, mount a persistent volume at /data.
"""

import logging
import os
import uuid
from pathlib import Path

from weasyprint import CSS, HTML

from app.services.audit_logger import AuditLogger
from app.db.session import AsyncSession

logger = logging.getLogger(__name__)

PDF_ROOT = Path(os.getenv("PDF_STORAGE_PATH", "/data/pdfs"))

_BASE_CSS = CSS(string="""
    @page { margin: 2cm; size: A4; }
    body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
           font-size: 11pt; line-height: 1.5; color: #1a1a1a; }
    h1 { font-size: 20pt; margin-bottom: 4pt; }
    h2 { font-size: 13pt; border-bottom: 1px solid #ccc; padding-bottom: 2pt;
         margin-top: 14pt; }
    h3 { font-size: 11pt; margin-bottom: 2pt; }
    ul { margin: 4pt 0; padding-left: 16pt; }
    .meta { color: #555; font-size: 10pt; }
    .score-badge { display:inline-block; background:#0ea5e9; color:#fff;
                   border-radius:4px; padding:2px 8px; font-size:10pt; }
""")


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _safe_filename(name: str) -> str:
    return "".join(c if c.isalnum() or c in "._-" else "_" for c in name)


async def build_pdf(
    html_content: str,
    user_id: uuid.UUID,
    document_type: str,  # "resume" | "cover_letter" | "interview_debrief"
    filename_hint: str,
    db: AsyncSession,
    audit: AuditLogger,
) -> str:
    """
    Renders html_content to PDF and saves it.
    Returns the absolute path to the saved PDF.
    """
    user_dir = PDF_ROOT / str(user_id)
    _ensure_dir(user_dir)

    safe_hint = _safe_filename(filename_hint)
    file_id = uuid.uuid4().hex[:8]
    filename = f"{document_type}_{safe_hint}_{file_id}.pdf"
    output_path = user_dir / filename

    try:
        HTML(string=html_content).write_pdf(
            str(output_path),
            stylesheets=[_BASE_CSS],
        )
    except Exception as exc:
        logger.error("WeasyPrint failed for %s/%s: %s", user_id, filename, exc)
        await audit.log(
            db=db,
            event_type="pdf_generated",
            entity_type=document_type,
            status="error",
            error_message=str(exc),
        )
        raise

    await audit.log(
        db=db,
        event_type="pdf_generated",
        entity_type=document_type,
        payload={"path": str(output_path), "size_bytes": output_path.stat().st_size},
    )

    logger.info("PDF written: %s (%d bytes)", output_path, output_path.stat().st_size)
    return str(output_path)
