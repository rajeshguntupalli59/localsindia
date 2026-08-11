import uuid
from datetime import datetime, timezone, timedelta, date as date_type

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, asc, desc, or_
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


async def _save_category_details(
    db: AsyncSession, listing_id: uuid.UUID, category_slug: str, details: dict,
) -> None:
    """Validate `details` against the schema for `category_slug` and persist
    it into the matching *_details table. No-op for categories without one
    (Classifieds, Businesses, Events) or an empty/missing payload."""
    from app.models.listing_details import DETAILS_BY_CATEGORY_SLUG
    from app.schemas.listing import DETAILS_SCHEMA_BY_CATEGORY_SLUG

    schema_cls = DETAILS_SCHEMA_BY_CATEGORY_SLUG.get(category_slug)
    model_cls = DETAILS_BY_CATEGORY_SLUG.get(category_slug)
    if not schema_cls or not model_cls:
        return
    validated = schema_cls(**details)
    db.add(model_cls(listing_id=listing_id, **validated.model_dump()))
    await db.commit()


async def _load_category_details(
    db: AsyncSession, listing_id: uuid.UUID, category_slug: str | None,
) -> dict | None:
    """Fetch the category-specific detail row for a listing, if its category
    has one, as a plain dict for ListingOut.category_details."""
    from app.models.listing_details import DETAILS_BY_CATEGORY_SLUG

    model_cls = DETAILS_BY_CATEGORY_SLUG.get(category_slug or "")
    if not model_cls:
        return None
    result = await db.execute(select(model_cls).where(model_cls.listing_id == listing_id))
    row = result.scalar_one_or_none()
    if not row:
        return None
    exclude = {"id", "listing_id", "created_at", "_sa_instance_state"}
    return {k: v for k, v in row.__dict__.items() if k not in exclude}


async def _get_active_listing(listing_id: uuid.UUID, db: AsyncSession) -> Listing:
    result = await db.execute(
        select(Listing).where(Listing.id == listing_id, Listing.deleted_at.is_(None))
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    return listing


@router.get("/cities/{slug}/listings/today-count")
async def today_listing_count(slug: str, db: AsyncSession = Depends(get_db)):
    city_result = await db.execute(select(City).where(City.slug == slug, City.active == True))
    city = city_result.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found.")
    today_start = datetime.combine(date_type.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    count_result = await db.execute(
        select(func.count()).select_from(Listing).where(
            Listing.city_id == city.id,
            Listing.status == "active",
            Listing.deleted_at.is_(None),
            Listing.created_at >= today_start,
        )
    )
    return {"count": count_result.scalar() or 0}


@router.get("/cities/{slug}/listings/trending", response_model=list[ListingOut])
async def trending_listings(slug: str, db: AsyncSession = Depends(get_db)):
    from app.models.category import Category

    city_result = await db.execute(select(City).where(City.slug == slug, City.active == True))
    city = city_result.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found.")

    cutoff = datetime.now(timezone.utc) - timedelta(hours=48)
    stmt = (
        select(Listing)
        .where(
            Listing.city_id == city.id,
            Listing.status == "active",
            Listing.deleted_at.is_(None),
            Listing.created_at >= cutoff,
        )
        .order_by(Listing.is_featured.desc(), Listing.featured_at.desc().nulls_last(), Listing.created_at.desc())
        .limit(10)
    )
    result = await db.execute(stmt)
    listings = result.scalars().all()

    if len(listings) < 3:
        stmt = (
            select(Listing)
            .where(
                Listing.city_id == city.id,
                Listing.status == "active",
                Listing.deleted_at.is_(None),
            )
            .order_by(Listing.is_featured.desc(), Listing.featured_at.desc().nulls_last(), Listing.created_at.desc())
            .limit(10)
        )
        result = await db.execute(stmt)
        listings = result.scalars().all()

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
    lat: float | None = Query(default=None),
    lng: float | None = Query(default=None),
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
        # OR-match each word instead of requiring the whole phrase as one
        # literal substring — "dental service near me" used to need that exact
        # phrase to appear verbatim in the text, which almost nothing does.
        words = [w for w in q.strip().split() if w]
        if words:
            stmt = stmt.where(or_(*[
                Listing.title.ilike(f"%{w}%") | Listing.description.ilike(f"%{w}%")
                for w in words
            ]))
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

    # Distance from the caller's location, when given — Haversine in plain SQL
    # since no PostGIS/earthdistance extension is available. NULL for listings
    # with no latitude/longitude, so nulls_last() keeps them in the results
    # instead of dropping them.
    order_clauses = [Listing.is_featured.desc()]
    if lat is not None and lng is not None:
        distance_km = 6371 * func.acos(
            func.least(1.0, func.greatest(-1.0,
                func.cos(func.radians(lat)) * func.cos(func.radians(Listing.latitude))
                * func.cos(func.radians(Listing.longitude) - func.radians(lng))
                + func.sin(func.radians(lat)) * func.sin(func.radians(Listing.latitude))
            ))
        )
        order_clauses.append(distance_km.asc().nulls_last())

    # Sort
    if sort == "price_asc":
        order_clauses += [Listing.featured_at.desc().nulls_last(), asc(Listing.price).nulls_last()]
    elif sort == "price_desc":
        order_clauses += [Listing.featured_at.desc().nulls_last(), desc(Listing.price).nulls_first()]
    else:
        order_clauses += [Listing.featured_at.desc().nulls_last(), Listing.created_at.desc()]
    stmt = stmt.order_by(*order_clauses)

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
    from app.models.category import Category

    # Resolve city: accept either city_id UUID or city_slug string
    city_id = body.city_id
    if city_id is None:
        if not body.city_slug:
            raise HTTPException(status_code=422, detail="city_id or city_slug is required.")
        city_result = await db.execute(
            select(City).where(City.slug == body.city_slug.lower(), City.active == True)
        )
        city = city_result.scalar_one_or_none()
        if not city:
            raise HTTPException(status_code=404, detail=f"City '{body.city_slug}' not found.")
        city_id = city.id

    # Resolve category: accept either category_id UUID or category_slug string
    category_id = body.category_id
    if category_id is None:
        if not body.category_slug:
            raise HTTPException(status_code=422, detail="category_id or category_slug is required.")
        cat_result = await db.execute(
            select(Category).where(Category.slug == body.category_slug.lower())
        )
        cat = cat_result.scalar_one_or_none()
        if not cat:
            raise HTTPException(status_code=404, detail=f"Category '{body.category_slug}' not found.")
        category_id = cat.id

    # Resolved regardless of whether category_id or category_slug was sent in,
    # so category_details persistence always knows which *_details table (if any).
    resolved_cat_result = await db.execute(select(Category).where(Category.id == category_id))
    resolved_cat = resolved_cat_result.scalar_one_or_none()
    resolved_category_slug = resolved_cat.slug if resolved_cat else None

    # Auto-generate whatsapp_url from contact_phone if not provided
    whatsapp_url = body.whatsapp_url
    if not whatsapp_url and body.contact_phone.startswith("+91"):
        whatsapp_url = f"https://wa.me/{body.contact_phone[1:]}"

    # BL-02: max 10 active listings per user per city (admins exempt)
    if current_user.role != "admin":
        count_result = await db.execute(
            select(func.count()).select_from(Listing).where(
                Listing.user_id == current_user.id,
                Listing.city_id == city_id,
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
        city_id=city_id,
        category_id=category_id,
        title=body.title,
        description=body.description,
        price=body.price,
        contact_phone=body.contact_phone,
        whatsapp_url=whatsapp_url,
        website_url=body.website_url,
        social_url=body.social_url,
        area=body.area,
        latitude=body.latitude,
        longitude=body.longitude,
        status="pending",  # BL-11: always pending on create
        is_seed=body.is_seed and current_user.role == "admin",
    )
    db.add(listing)
    await db.commit()
    await db.refresh(listing)

    if body.category_details and resolved_category_slug:
        await _save_category_details(db, listing.id, resolved_category_slug, body.category_details)

    out = ListingOut.model_validate(listing)
    out.category_slug = resolved_category_slug
    out.category_details = await _load_category_details(db, listing.id, resolved_category_slug)
    return out


@router.get("/listings/mine", response_model=list[ListingOut])
async def my_listings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.city import City as CityModel
    from app.models.category import Category
    result = await db.execute(
        select(Listing)
        .where(Listing.user_id == current_user.id, Listing.deleted_at.is_(None))
        .order_by(Listing.created_at.desc())
    )
    listings = result.scalars().all()
    out = []
    for listing in listings:
        item = ListingOut.model_validate(listing)
        city_res = await db.execute(select(CityModel).where(CityModel.id == listing.city_id))
        city = city_res.scalar_one_or_none()
        if city:
            item.city_slug = city.slug
        cat_res = await db.execute(select(Category).where(Category.id == listing.category_id))
        cat = cat_res.scalar_one_or_none()
        if cat:
            item.category_slug = cat.slug
            item.category_details = await _load_category_details(db, listing.id, cat.slug)
        out.append(item)
    return out


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
    out.category_details = await _load_category_details(db, listing.id, cat.slug if cat else None)
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

    now = datetime.now(timezone.utc)

    # 24h cooldown on renew for active listings (expired listings can always renew)
    if listing.status == "active" and listing.last_renewed_at:
        hours_since = (now - listing.last_renewed_at).total_seconds() / 3600
        if hours_since < 24:
            hours_left = round(24 - hours_since, 1)
            raise HTTPException(
                status_code=429,
                detail=f"Renew available in {hours_left}h",
            )

    listing.expires_at = now + timedelta(days=RENEW_DAYS)
    listing.last_renewed_at = now
    # Only require re-approval for expired/rejected listings, not active ones
    if listing.status != "active":
        listing.status = "pending"
    await db.commit()
    await db.refresh(listing)
    return listing


@router.post("/listings/{listing_id}/view", status_code=204)
async def record_view(listing_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Fire-and-forget: increments view_count on active listing."""
    result = await db.execute(
        select(Listing).where(
            Listing.id == listing_id,
            Listing.status == "active",
            Listing.deleted_at.is_(None),
        )
    )
    listing = result.scalar_one_or_none()
    if listing:
        listing.view_count = (listing.view_count or 0) + 1
        await db.commit()


@router.post("/listings/{listing_id}/wa-click", status_code=204)
async def wa_click(listing_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Fire-and-forget: marks wa_verified=true + increments contact_click_count."""
    result = await db.execute(
        select(Listing).where(
            Listing.id == listing_id,
            Listing.status == "active",
            Listing.deleted_at.is_(None),
        )
    )
    listing = result.scalar_one_or_none()
    if listing:
        listing.wa_verified = True
        listing.contact_click_count = (listing.contact_click_count or 0) + 1
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
