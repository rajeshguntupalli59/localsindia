import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, distinct, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

PLACEHOLDER_URLS = [
    "https://placehold.co/400x300/f97316/white?text=LocalsIndia",
    "https://placehold.co/400x300/3b82f6/white?text=LocalsIndia",
    "https://placehold.co/400x300/10b981/white?text=LocalsIndia",
    "https://placehold.co/400x300/8b5cf6/white?text=LocalsIndia",
    "https://placehold.co/400x300/ef4444/white?text=LocalsIndia",
]

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.app_error_log import AppErrorLog
from app.models.business import Business
from app.models.event import Event
from app.models.listing import Listing
from app.models.report import Report
from app.models.user import User
from app.schemas.business import BusinessOut
from app.schemas.error_log import ErrorLogGroup
from app.schemas.event import EventOut
from app.schemas.listing import ListingOut


class RoleUpdate(BaseModel):
    role: str

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/listings/pending", response_model=list[ListingOut])
async def pending_listings(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Listing)
        .where(Listing.status == "pending", Listing.deleted_at.is_(None))
        .order_by(Listing.created_at.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return result.scalars().all()


@router.get("/listings", response_model=list[ListingOut])
async def list_listings_by_status(
    status: str = "active",
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Listing)
        .where(Listing.status == status, Listing.deleted_at.is_(None))
        .order_by(Listing.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return result.scalars().all()


@router.patch("/listings/{listing_id}/approve", response_model=ListingOut)
async def approve_listing(
    listing_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Listing).where(Listing.id == listing_id, Listing.deleted_at.is_(None))
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    listing.status = "active"
    await db.commit()
    await db.refresh(listing)

    # In-app notification + email to listing owner
    try:
        from app.services.notification_svc import notify
        from app.services.email_svc import send_listing_approved_email
        owner = await db.execute(select(User).where(User.id == listing.user_id))
        owner_user = owner.scalar_one_or_none()
        listing_url = f"https://localsindia.com/listing/{listing.id}"
        await notify(
            db, listing.user_id, "listing_approved",
            f"Your listing is live — {listing.title[:60]}",
            "It's now visible to buyers in your city.",
            listing_url, listing.id,
        )
        if owner_user and owner_user.email:
            await send_listing_approved_email(owner_user.email, listing.title, listing_url)
    except Exception:
        pass  # never block the admin action

    return listing


@router.patch("/listings/{listing_id}/reject", response_model=ListingOut)
async def reject_listing(
    listing_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Listing).where(Listing.id == listing_id, Listing.deleted_at.is_(None))
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    listing.status = "rejected"
    await db.commit()
    await db.refresh(listing)
    return listing


@router.get("/events/pending", response_model=list[EventOut])
async def pending_events(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Event)
        .where(Event.status == "pending", Event.deleted_at.is_(None))
        .order_by(Event.created_at.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return result.scalars().all()


@router.get("/events", response_model=list[EventOut])
async def list_events_by_status(
    status: str = "active",
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Event)
        .where(Event.status == status, Event.deleted_at.is_(None))
        .order_by(Event.event_date.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return result.scalars().all()


@router.patch("/events/{event_id}/approve", response_model=EventOut)
async def approve_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.deleted_at.is_(None))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    event.status = "active"
    await db.commit()
    await db.refresh(event)
    return event


@router.patch("/events/{event_id}/reject", response_model=EventOut)
async def reject_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.deleted_at.is_(None))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    event.status = "cancelled"
    await db.commit()
    await db.refresh(event)
    return event


@router.get("/users")
async def list_users(
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(User)
        .where(User.deleted_at.is_(None))
        .order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    users = result.scalars().all()
    return [
        {
            "id": str(u.id),
            "phone": u.phone,
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: uuid.UUID,
    body: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    if body.role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'user'.")
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role.")
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.role = body.role
    await db.commit()
    await db.refresh(user)
    return {"id": str(user.id), "name": user.name, "role": user.role}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.deleted_at = datetime.now(timezone.utc)
    user.is_active = False
    await db.commit()
    return {"success": True, "message": f"User {user_id} deleted."}


@router.post("/seed-placeholder-images")
async def seed_placeholder_images(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Add placeholder images to all listings that have no photos.
    Also corrects any previously-seeded placeholders with the old "LocalIndia" typo.
    """
    from app.models.listing_image import ListingImage

    fixed = 0
    typo_result = await db.execute(
        select(ListingImage).where(ListingImage.url.like("%text=LocalIndia%"))
    )
    for img in typo_result.scalars().all():
        img.url = img.url.replace("text=LocalIndia", "text=LocalsIndia")
        fixed += 1

    result = await db.execute(select(Listing).where(Listing.deleted_at.is_(None)))
    listings = result.scalars().all()

    added = 0
    for i, listing in enumerate(listings):
        img_result = await db.execute(
            select(ListingImage).where(ListingImage.listing_id == listing.id)
        )
        if img_result.scalars().first():
            continue
        img = ListingImage(
            listing_id=listing.id,
            url=PLACEHOLDER_URLS[i % len(PLACEHOLDER_URLS)],
            cloudinary_id=f"placeholder/{uuid.uuid4()}",
            display_order=0,
        )
        db.add(img)
        added += 1

    await db.commit()
    return {
        "seeded": added,
        "fixed_typo": fixed,
        "message": f"Added placeholder images to {added} listings; fixed typo on {fixed} existing images.",
    }


@router.get("/stats")
async def get_platform_stats(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    from app.models.city import City
    from app.models.otp_request import OtpRequest
    from app.models.saved_listing import SavedListing
    from app.models.listing_review import ListingReview
    from app.core.config import settings

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)

    # Users
    users_total = await db.scalar(
        select(func.count()).select_from(User).where(User.deleted_at.is_(None))
    )
    users_new_today = await db.scalar(
        select(func.count()).select_from(User)
        .where(User.created_at >= today_start, User.deleted_at.is_(None))
    )
    users_new_7d = await db.scalar(
        select(func.count()).select_from(User)
        .where(User.created_at >= week_start, User.deleted_at.is_(None))
    )
    new_users_by_day_result = await db.execute(
        select(cast(User.created_at, Date).label("day"), func.count().label("count"))
        .where(User.created_at >= week_start, User.deleted_at.is_(None))
        .group_by(cast(User.created_at, Date))
        .order_by(cast(User.created_at, Date))
    )
    new_users_by_day = [{"date": str(row.day), "count": row.count} for row in new_users_by_day_result]

    # Listings by status
    listing_counts_result = await db.execute(
        select(Listing.status, func.count()).select_from(Listing)
        .where(Listing.deleted_at.is_(None))
        .group_by(Listing.status)
    )
    listing_by_status = {row[0]: row[1] for row in listing_counts_result}

    featured_count = await db.scalar(
        select(func.count()).select_from(Listing)
        .where(Listing.is_featured.is_(True), Listing.deleted_at.is_(None), Listing.expires_at > now)
    )
    view_total = await db.scalar(
        select(func.coalesce(func.sum(Listing.view_count), 0)).select_from(Listing)
        .where(Listing.deleted_at.is_(None))
    )
    contact_total = await db.scalar(
        select(func.coalesce(func.sum(Listing.contact_click_count), 0)).select_from(Listing)
        .where(Listing.deleted_at.is_(None))
    )

    # Events
    events_pending = await db.scalar(
        select(func.count()).select_from(Event)
        .where(Event.status == "pending", Event.deleted_at.is_(None))
    )
    events_active = await db.scalar(
        select(func.count()).select_from(Event)
        .where(Event.status == "active", Event.deleted_at.is_(None))
    )

    # Cities
    cities_total = await db.scalar(
        select(func.count()).select_from(City).where(City.active.is_(True))
    )
    cities_with_listings = await db.scalar(
        select(func.count(distinct(Listing.city_id))).select_from(Listing)
        .where(Listing.deleted_at.is_(None), Listing.status == "active")
    )
    top_cities_result = await db.execute(
        select(City.name, City.state, func.count(Listing.id).label("listing_count"))
        .join(Listing, Listing.city_id == City.id)
        .where(Listing.deleted_at.is_(None), Listing.status == "active")
        .group_by(City.id, City.name, City.state)
        .order_by(func.count(Listing.id).desc())
        .limit(15)
    )
    top_cities = [{"name": r.name, "state": r.state, "count": r.listing_count} for r in top_cities_result]

    # OTP
    otp_today_total = await db.scalar(
        select(func.count()).select_from(OtpRequest).where(OtpRequest.created_at >= today_start)
    )
    otp_today_verified = await db.scalar(
        select(func.count()).select_from(OtpRequest)
        .where(OtpRequest.created_at >= today_start, OtpRequest.verified.is_(True))
    )

    # Content
    reports_total = await db.scalar(select(func.count()).select_from(Report))
    saves_total = await db.scalar(select(func.count()).select_from(SavedListing))
    reviews_total = await db.scalar(select(func.count()).select_from(ListingReview))

    return {
        "users": {
            "total": users_total or 0,
            "new_today": users_new_today or 0,
            "new_7d": users_new_7d or 0,
            "new_by_day": new_users_by_day,
        },
        "listings": {
            "total": sum(listing_by_status.values()),
            "pending": listing_by_status.get("pending", 0),
            "active": listing_by_status.get("active", 0),
            "flagged": listing_by_status.get("flagged", 0),
            "rejected": listing_by_status.get("rejected", 0),
            "expired": listing_by_status.get("expired", 0),
            "fulfilled": listing_by_status.get("fulfilled", 0),
            "featured": featured_count or 0,
            "total_views": int(view_total or 0),
            "total_contacts": int(contact_total or 0),
        },
        "events": {
            "pending": events_pending or 0,
            "active": events_active or 0,
        },
        "cities": {
            "total": cities_total or 0,
            "with_listings": cities_with_listings or 0,
            "top": top_cities,
        },
        "otp": {
            "today_total": otp_today_total or 0,
            "today_verified": otp_today_verified or 0,
        },
        "content": {
            "reports": reports_total or 0,
            "saves": saves_total or 0,
            "reviews": reviews_total or 0,
        },
        "system": {
            "chatbot_key_set": bool(settings.GOOGLE_AI_KEY),
            "razorpay_configured": bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET),
            "sendgrid_configured": bool(settings.SENDGRID_API_KEY),
        },
    }


@router.get("/errors", response_model=list[ErrorLogGroup])
async def list_app_errors(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Recent app errors reported from mobile/web, grouped by message so repeat
    crashes show up as one row with a count instead of flooding the list."""
    result = await db.execute(
        select(
            AppErrorLog.message,
            AppErrorLog.platform,
            AppErrorLog.context,
            func.count().label("count"),
            func.max(AppErrorLog.created_at).label("last_seen"),
        )
        .group_by(AppErrorLog.message, AppErrorLog.platform, AppErrorLog.context)
        .order_by(func.max(AppErrorLog.created_at).desc())
        .limit(100)
    )
    return [
        ErrorLogGroup(
            message=row.message, platform=row.platform, context=row.context,
            count=row.count, last_seen=row.last_seen,
        )
        for row in result
    ]


@router.get("/businesses")
async def list_businesses_admin(
    page: int = 1,
    page_size: int = 50,
    verified_only: bool = False,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    from sqlalchemy.orm import selectinload
    q = (
        select(Business)
        .options(selectinload(Business.reviews))
        .where(Business.deleted_at.is_(None))
        .order_by(Business.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if verified_only:
        q = q.where(Business.verified.is_(True))
    result = await db.execute(q)
    businesses = result.scalars().all()
    return [
        {
            "id": str(b.id),
            "name": b.name,
            "city_id": str(b.city_id),
            "owner_id": str(b.owner_id) if b.owner_id else None,
            "verified": b.verified,
            "badge_plan": b.badge_plan,
            "badge_expires_at": b.badge_expires_at.isoformat() if b.badge_expires_at else None,
            "avg_rating": float(b.avg_rating) if b.avg_rating else None,
            "review_count": b.review_count,
            "created_at": b.created_at.isoformat(),
        }
        for b in businesses
    ]


@router.patch("/businesses/{business_id}/verify")
async def admin_verify_business(
    business_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Business).where(Business.id == business_id, Business.deleted_at.is_(None)))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found.")
    business.verified = True
    if not business.badge_expires_at or business.badge_expires_at < datetime.now(timezone.utc):
        business.badge_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        business.badge_plan = "admin_grant"
    await db.commit()
    return {"id": str(business.id), "verified": True, "badge_expires_at": business.badge_expires_at.isoformat()}


@router.delete("/businesses/{business_id}/verify")
async def admin_unverify_business(
    business_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Business).where(Business.id == business_id, Business.deleted_at.is_(None)))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found.")
    business.verified = False
    business.badge_plan = None
    business.badge_expires_at = None
    await db.commit()
    return {"id": str(business.id), "verified": False}


@router.get("/reports")
async def list_reports(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Report)
        .order_by(Report.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    reports = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "listing_id": str(r.listing_id),
            "user_id": str(r.user_id),
            "reason": r.reason,
            "notes": r.notes,
            "created_at": r.created_at.isoformat(),
        }
        for r in reports
    ]
