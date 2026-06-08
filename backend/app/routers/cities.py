from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.city import City
from app.schemas.city import CityOut

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
