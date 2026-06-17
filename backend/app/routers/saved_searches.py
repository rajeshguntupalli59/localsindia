import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.saved_search import SavedSearch
from app.models.user import User

router = APIRouter(prefix="/api/v1/saved-searches", tags=["saved-searches"])


class SavedSearchCreate(BaseModel):
    city_slug: str
    query_text: str | None = None
    category_slug: str | None = None


class SavedSearchOut(BaseModel):
    id: uuid.UUID
    city_slug: str
    query_text: str | None
    category_slug: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.post("", response_model=SavedSearchOut, status_code=201)
async def create_saved_search(
    body: SavedSearchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(
        select(SavedSearch).where(
            SavedSearch.user_id == current_user.id,
            SavedSearch.city_slug == body.city_slug,
            SavedSearch.query_text == body.query_text,
            SavedSearch.category_slug == body.category_slug,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Search already saved.")

    ss = SavedSearch(
        user_id=current_user.id,
        city_slug=body.city_slug,
        query_text=body.query_text,
        category_slug=body.category_slug,
    )
    db.add(ss)
    await db.commit()
    await db.refresh(ss)
    return ss


@router.get("", response_model=list[SavedSearchOut])
async def list_saved_searches(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SavedSearch)
        .where(SavedSearch.user_id == current_user.id)
        .order_by(SavedSearch.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/{search_id}", status_code=204)
async def delete_saved_search(
    search_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SavedSearch).where(
            SavedSearch.id == search_id,
            SavedSearch.user_id == current_user.id,
        )
    )
    ss = result.scalar_one_or_none()
    if not ss:
        raise HTTPException(status_code=404, detail="Saved search not found.")
    await db.delete(ss)
    await db.commit()
