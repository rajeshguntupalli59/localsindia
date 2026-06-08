import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.city import City
from app.services import search_svc

router = APIRouter(prefix="/api/v1/search", tags=["search"])


@router.get("")
async def search(
    q: str = Query(..., min_length=1, max_length=100),
    city_slug: str = Query(...),
    category_id: uuid.UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=50),
    db: AsyncSession = Depends(get_db),
):
    city_result = await db.execute(select(City).where(City.slug == city_slug, City.active == True))
    city = city_result.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found.")

    return await search_svc.search_listings(
        db,
        city_id=city.id,
        q=q,
        category_id=category_id,
        page=page,
        page_size=page_size,
    )
