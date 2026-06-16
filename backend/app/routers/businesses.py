import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.business import Business
from app.models.city import City
from app.models.review import Review
from app.models.user import User
from app.schemas.business import BusinessCreate, BusinessOut, BusinessUpdate, ReviewCreate, ReviewOut

router = APIRouter(prefix="/api/v1", tags=["businesses"])


async def _get_active_business(business_id: uuid.UUID, db: AsyncSession) -> Business:
    result = await db.execute(
        select(Business)
        .options(selectinload(Business.reviews))
        .where(Business.id == business_id, Business.deleted_at.is_(None))
    )
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found.")
    return business


@router.get("/businesses", response_model=list[BusinessOut])
async def list_businesses(
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

    q = (
        select(Business)
        .options(selectinload(Business.reviews))
        .where(Business.city_id == city.id, Business.deleted_at.is_(None))
        .order_by(Business.verified.desc(), Business.avg_rating.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if category_id:
        q = q.where(Business.category_id == category_id)

    result = await db.execute(q)
    return result.scalars().all()


@router.post("/businesses", response_model=BusinessOut, status_code=201)
async def create_business(
    payload: BusinessCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    city_result = await db.execute(select(City).where(City.id == payload.city_id, City.active == True))
    if not city_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="City not found.")

    business = Business(
        city_id=payload.city_id,
        owner_id=current_user.id,
        category_id=payload.category_id,
        name=payload.name,
        description=payload.description,
        address=payload.address,
        phone=payload.phone,
        whatsapp_url=payload.whatsapp_url,
        website_url=payload.website_url,
    )
    db.add(business)
    await db.commit()
    await db.refresh(business)
    # reload with reviews
    return await _get_active_business(business.id, db)


@router.get("/businesses/{business_id}", response_model=BusinessOut)
async def get_business(
    business_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    return await _get_active_business(business_id, db)


@router.patch("/businesses/{business_id}", response_model=BusinessOut)
async def update_business(
    business_id: uuid.UUID,
    payload: BusinessUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_active_business(business_id, db)
    if business.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorised.")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(business, field, value)
    business.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(business)
    return await _get_active_business(business.id, db)


@router.delete("/businesses/{business_id}", status_code=204)
async def delete_business(
    business_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_active_business(business_id, db)
    if business.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorised.")
    business.deleted_at = datetime.now(timezone.utc)
    await db.commit()


@router.post("/businesses/{business_id}/claim", response_model=BusinessOut)
async def claim_business(
    business_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_active_business(business_id, db)
    if business.owner_id is not None:
        raise HTTPException(status_code=409, detail="Business already claimed.")

    business.owner_id = current_user.id
    await db.commit()
    await db.refresh(business)
    return await _get_active_business(business.id, db)


@router.post("/businesses/{business_id}/reviews", response_model=ReviewOut, status_code=201)
async def add_review(
    business_id: uuid.UUID,
    payload: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_active_business(business_id, db)

    # Check for existing review
    existing = await db.execute(
        select(Review).where(
            Review.business_id == business_id,
            Review.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="You have already reviewed this business.")

    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=422, detail="Rating must be between 1 and 5.")

    review = Review(
        business_id=business_id,
        user_id=current_user.id,
        rating=payload.rating,
        body=payload.body,
    )
    db.add(review)
    await db.flush()

    # Recalculate avg_rating
    avg_result = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(
            Review.business_id == business_id
        )
    )
    avg, count = avg_result.one()
    business.avg_rating = float(avg) if avg else 0
    business.review_count = count

    await db.commit()
    await db.refresh(review)
    return review
