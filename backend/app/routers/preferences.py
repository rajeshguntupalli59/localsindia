from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user_preference import UserPreference
from app.models.user import User

router = APIRouter(prefix="/api/v1/preferences", tags=["preferences"])


class PreferenceIn(BaseModel):
    interests: Optional[list[str]] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    city_prefs: Optional[list[str]] = None
    timeline: Optional[str] = None
    alert_frequency: str = "never"
    email_frequency: Optional[str] = None  # mobile alias for alert_frequency
    push_enabled: bool = True
    onboarding_done: bool = False
    city_slug: Optional[str] = None  # informational only, not persisted

    @model_validator(mode="after")
    def map_email_frequency(self):
        # mobile sends email_frequency; backend stores as alert_frequency
        if self.email_frequency and self.alert_frequency == "never":
            self.alert_frequency = self.email_frequency
        return self


class PreferenceOut(BaseModel):
    interests: Optional[list[str]] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    city_prefs: Optional[list[str]] = None
    timeline: Optional[str] = None
    alert_frequency: str = "never"
    email_frequency: Optional[str] = None
    push_enabled: bool = True
    onboarding_done: bool = False
    model_config = {"from_attributes": True}


@router.get("", response_model=PreferenceOut)
async def get_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    pref = result.scalar_one_or_none()
    if not pref:
        return PreferenceOut(onboarding_done=False)
    return PreferenceOut(
        interests=pref.interests,
        budget_min=pref.budget_min,
        budget_max=pref.budget_max,
        city_prefs=pref.city_prefs,
        timeline=pref.timeline,
        alert_frequency=pref.alert_frequency,
        email_frequency=pref.alert_frequency,
        push_enabled=pref.push_enabled,
        onboarding_done=pref.onboarding_done,
    )


@router.post("", response_model=PreferenceOut)
async def save_preferences(
    body: PreferenceIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    pref = result.scalar_one_or_none()
    if pref:
        pref.interests = body.interests
        pref.budget_min = body.budget_min
        pref.budget_max = body.budget_max
        pref.city_prefs = body.city_prefs
        pref.timeline = body.timeline
        pref.alert_frequency = body.alert_frequency
        pref.push_enabled = body.push_enabled
        pref.onboarding_done = body.onboarding_done
    else:
        pref = UserPreference(
            user_id=current_user.id,
            interests=body.interests,
            budget_min=body.budget_min,
            budget_max=body.budget_max,
            city_prefs=body.city_prefs,
            timeline=body.timeline,
            alert_frequency=body.alert_frequency,
            push_enabled=body.push_enabled,
            onboarding_done=body.onboarding_done,
        )
        db.add(pref)
    await db.commit()
    await db.refresh(pref)
    return PreferenceOut(
        interests=pref.interests,
        budget_min=pref.budget_min,
        budget_max=pref.budget_max,
        city_prefs=pref.city_prefs,
        timeline=pref.timeline,
        alert_frequency=pref.alert_frequency,
        email_frequency=pref.alert_frequency,
        push_enabled=pref.push_enabled,
        onboarding_done=pref.onboarding_done,
    )
