import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.city import City
from app.models.listing import Listing
from app.models.report import Report
from app.models.user import User
from app.schemas.listing import (
    ListingCreate, ListingOut, ListingUpdate, ReportCreate,
)

router = APIRouter(prefix="/api/v1", tags=["listings"])

MAX_ACTIVE_PER_USER_PER_CITY = 10
REPORT_FLAG_THRESHOLD = 3
RENEW_DAYS = 30


async def _get_active_listing(listing_id: uuid.UUID, db: AsyncSession) -> Listing:
    result = await db.execute(
        select(Listing).where(Listing.id == listing_id, Listing.deleted_at.is_(None))
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    return listing


@router.get("/cities/{slug}/listings", response_model=list[ListingOut])
async def list_city_listings(
    slug: str,
    category_id: uuid.UUID | None = Query(default=None),
    status: str = Query(default="active"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=50),
    db: AsyncSession = Depends(get_db),
):
    city_result = await db.execute(select(City).where(City.slug == slug, City.active == True))
    city = city_result.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found.")

    q = (
        select(Listing)
        .where(
            Listing.city_id == city.id,
            Listing.status == status,
            Listing.deleted_at.is_(None),
        )
        .order_by(Listing.is_featured.desc(), Listing.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if category_id:
        q = q.where(Listing.category_id == category_id)

    result = await db.execute(q)
    return result.scalars().all()


@router.post("/listings", response_model=ListingOut, status_code=201)
async def create_listing(
    body: ListingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # BL-02: max 10 active listings per user per city
    count_result = await db.execute(
        select(func.count()).select_from(Listing).where(
            Listing.user_id == current_user.id,
            Listing.city_id == body.city_id,
            Listing.status.in_(["active", "pending"]),
            Listing.deleted_at.is_(None),
        )
    )
    if count_result.scalar() >= MAX_ACTIVE_PER_USER_PER_CITY:
        raise HTTPException(
            status_code=429,
            detail="Maximum 10 active listings per city reached.",
        )

    listing = Listing(
        user_id=current_user.id,
        city_id=body.city_id,
        category_id=body.category_id,
        title=body.title,
        description=body.description,
        price=body.price,
        contact_phone=body.contact_phone,
        whatsapp_url=body.whatsapp_url,
        status="pending",  # BL-11: always pending on create
    )
    db.add(listing)
    await db.commit()
    await db.refresh(listing)
    return listing


@router.get("/listings/mine", response_model=list[ListingOut])
async def my_listings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Listing)
        .where(Listing.user_id == current_user.id, Listing.deleted_at.is_(None))
        .order_by(Listing.created_at.desc())
    )
    return result.scalars().all()


@router.get("/listings/{listing_id}", response_model=ListingOut)
async def get_listing(listing_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await _get_active_listing(listing_id, db)


@router.patch("/listings/{listing_id}", response_model=ListingOut)
async def update_listing(
    listing_id: uuid.UUID,
    body: ListingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listing = await _get_active_listing(listing_id, db)
    if listing.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorised.")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(listing, field, value)

    await db.commit()
    await db.refresh(listing)
    return listing


@router.delete("/listings/{listing_id}", status_code=204)
async def delete_listing(
    listing_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listing = await _get_active_listing(listing_id, db)
    if listing.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorised.")
    listing.deleted_at = datetime.now(timezone.utc)
    await db.commit()


@router.post("/listings/{listing_id}/report", status_code=201)
async def report_listing(
    listing_id: uuid.UUID,
    body: ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listing = await _get_active_listing(listing_id, db)

    existing = await db.execute(
        select(Report).where(
            Report.listing_id == listing_id,
            Report.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already reported.")

    report = Report(
        listing_id=listing_id,
        user_id=current_user.id,
        reason=body.reason,
        notes=body.notes,
    )
    db.add(report)

    # BL-04: 3 reports → flagged, hide from public
    listing.report_count += 1
    if listing.report_count >= REPORT_FLAG_THRESHOLD:
        listing.status = "flagged"

    await db.commit()
    return {"message": "Report submitted."}


@router.post("/listings/{listing_id}/renew", response_model=ListingOut)
async def renew_listing(
    listing_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listing = await _get_active_listing(listing_id, db)
    if listing.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorised.")
    listing.expires_at = datetime.now(timezone.utc) + timedelta(days=RENEW_DAYS)
    listing.status = "pending"  # needs re-approval after renew
    await db.commit()
    await db.refresh(listing)
    return listing


@router.post("/listings/{listing_id}/fulfill", response_model=ListingOut)
async def fulfill_listing(
    listing_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    listing = await _get_active_listing(listing_id, db)
    if listing.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorised.")
    listing.status = "fulfilled"
    await db.commit()
    await db.refresh(listing)
    return listing
