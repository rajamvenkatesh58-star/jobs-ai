from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import get_current_user
from app.db.session import get_db
from app.models.profile import CandidateProfile
from app.models.user import User
from app.schemas.profile import ProfileRead, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/", response_model=ProfileRead)
async def get_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.put("/", response_model=ProfileRead)
async def update_profile(
    payload: ProfileUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = payload.model_dump(exclude_unset=True)

    # Serialize nested Pydantic models to plain dicts for JSONB columns
    for jsonb_field in ("work_experience", "education", "certifications", "languages"):
        if jsonb_field in update_data and update_data[jsonb_field] is not None:
            update_data[jsonb_field] = [
                item.model_dump() if hasattr(item, "model_dump") else item
                for item in update_data[jsonb_field]
            ]

    if "scoring_weights" in update_data and update_data["scoring_weights"] is not None:
        sw = update_data["scoring_weights"]
        update_data["scoring_weights"] = (
            sw.model_dump() if hasattr(sw, "model_dump") else sw
        )

    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return profile
