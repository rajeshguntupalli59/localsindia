from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.city import City
from app.models.city_banner import CityBanner
from app.schemas.city import CityOut
from app.schemas.city_banner import CityBannerOut

router = APIRouter(prefix="/api/v1/cities", tags=["cities"])


@router.get("", response_model=list[CityOut])
async def list_cities(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(City).where(City.active == True).order_by(City.state, City.name)
    )
    return result.scalars().all()


@router.get("/{slug}", response_model=CityOut)
async def get_city(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(City).where(City.slug == slug, City.active == True))
    city = result.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found.")
    return city


@router.get("/{slug}/banner", response_model=CityBannerOut | None)
async def get_city_banner(slug: str, db: AsyncSession = Depends(get_db)):
    city_result = await db.execute(select(City).where(City.slug == slug, City.active == True))
    city = city_result.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found.")
    today = date.today()
    result = await db.execute(
        select(CityBanner)
        .where(
            CityBanner.city_id == city.id,
            CityBanner.start_date <= today,
            CityBanner.end_date >= today,
        )
        .order_by(CityBanner.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
