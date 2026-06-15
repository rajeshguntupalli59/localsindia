import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, asc, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.city import City
from app.models.listing import Listing
from app.models.listing_review import ListingReview
from app.models.report import Report
from app.models.user import User
from app.schemas.listing import (
    ListingCreate, ListingOut, ListingUpdate, ReportCreate,
)
from app.schemas.listing_review import ListingReviewCreate, ListingReviewOut

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
    q: str | None = Query(default=None),
    category_id: uuid.UUID | None = Query(default=None),
    category_slug: str | None = Query(default=None),
    status: str = Query(default="active"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=50),
    min_price: float | None = Query(default=None),
    max_price: float | None = Query(default=None),
    sort: str = Query(default="newest"),
    verified_only: bool = Query(default=False),
    within: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    from app.models.category import Category

    city_result = await db.execute(select(City).where(City.slug == slug, City.active == True))
    city = city_result.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found.")

    # Resolve category_slug → category_id if slug provided
    if not category_id and category_slug:
        cat_result = await db.execute(select(Category).where(Category.slug == category_slug))
        cat = cat_result.scalar_one_or_none()
        if cat:
            category_id = cat.id

    stmt = (
        select(Listing)
        .where(
            Listing.city_id == city.id,
            Listing.status == status,
            Listing.deleted_at.is_(None),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    if category_id:
        stmt = stmt.where(Listing.category_id == category_id)
    if q:
        stmt = stmt.where(
            Listing.title.ilike(f"%{q}%") | Listing.description.ilike(f"%{q}%")
        )
    if min_price is not None:
        stmt = stmt.where(Listing.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Listing.price <= max_price)
    if verified_only:
        stmt = stmt.where(Listing.wa_verified == True)
    if within:
        days_map = {"24h": 1, "7d": 7, "30d": 30}
        days = days_map.get(within)
        if days:
            cutoff = datetime.now(timezone.utc) - timedelta(days=days)
            stmt = stmt.where(Listing.created_at >= cutoff)

    # Sort
    if sort == "price_asc":
        stmt = stmt.order_by(Listing.is_featured.desc(), asc(Listing.price).nulls_last())
    elif sort == "price_desc":
        stmt = stmt.order_by(Listing.is_featured.desc(), desc(Listing.price).nulls_first())
    else:
        stmt = stmt.order_by(Listing.is_featured.desc(), Listing.created_at.desc())

    result = await db.execute(stmt)
    listings = result.scalars().all()

    # Batch-fetch categories to populate category_name and category_slug
    cat_ids = {l.category_id for l in listings}
    cat_map: dict[uuid.UUID, Category] = {}
    if cat_ids:
        cat_result = await db.execute(select(Category).where(Category.id.in_(cat_ids)))
        cat_map = {c.id: c for c in cat_result.scalars().all()}

    out_list = []
    for l in listings:
        out = ListingOut.model_validate(l)
        cat = cat_map.get(l.category_id)
        if cat:
            out.category_name = cat.name
            out.category_slug = cat.slug
        out_list.append(out)

    return out_list


@router.post("/listings", response_model=ListingOut, status_code=201)
async def create_listing(
    body: ListingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # BL-02: max 10 active listings per user per city (admins exempt)
    if current_user.role != "admin":
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
        website_url=body.website_url,
        social_url=body.social_url,
        area=body.area,
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
    from app.models.category import Category
    listing = await _get_active_listing(listing_id, db)
    out = ListingOut.model_validate(listing)
    cat_result = await db.execute(select(Category).where(Category.id == listing.category_id))
    cat = cat_result.scalar_one_or_none()
    user_result = await db.execute(select(User).where(User.id == listing.user_id))
    user = user_result.scalar_one_or_none()
    out.category_name = cat.name if cat else None
    out.category_slug = cat.slug if cat else None
    out.seller_name = (user.name or '').split('+91')[0].strip() or None if user else None
    return out


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


@router.post("/listings/{listing_id}/wa-click", status_code=204)
async def wa_click(listing_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Fire-and-forget: marks listing wa_verified=true on first WhatsApp tap."""
    result = await db.execute(
        select(Listing).where(
            Listing.id == listing_id,
            Listing.status == "active",
            Listing.deleted_at.is_(None),
            Listing.wa_verified == False,
        )
    )
    listing = result.scalar_one_or_none()
    if listing:
        listing.wa_verified = True
        await db.commit()


@router.get("/listings/{listing_id}/reviews", response_model=list[ListingReviewOut])
async def get_reviews(
    listing_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ListingReview)
        .where(ListingReview.listing_id == listing_id)
        .order_by(ListingReview.created_at.desc())
        .limit(50)
    )
    return result.scalars().all()


@router.post("/listings/{listing_id}/reviews", response_model=ListingReviewOut, status_code=201)
async def submit_review(
    listing_id: uuid.UUID,
    body: ListingReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_active_listing(listing_id, db)

    existing = await db.execute(
        select(ListingReview).where(
            ListingReview.listing_id == listing_id,
            ListingReview.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="You have already reviewed this listing.")

    review = ListingReview(
        listing_id=listing_id,
        user_id=current_user.id,
        rating=body.rating,
        body=body.body,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review


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
