import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, distinct, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

REFERRAL_REWARD_CAP = 20
REFERRAL_FEATURED_DAYS = 3

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
from app.models.buyer_request import BuyerRequest
from app.models.buyer_request_report import BuyerRequestReport
from app.models.category import Category
from app.models.city import City
from app.models.city_banner import CityBanner
from app.models.event import Event
from app.models.listing import Listing
from app.models.llm_usage_log import LlmUsageLog
from app.models.report import Report
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.business import BusinessOut
from app.schemas.city_banner import CityBannerCreate, CityBannerOut
from app.schemas.error_log import ErrorLogGroup
from app.schemas.event import EventOut
from app.schemas.listing import ListingOut
from app.schemas.ticket import TicketScanRequest, TicketScanResponse


class RoleUpdate(BaseModel):
    role: str


class BroadcastIn(BaseModel):
    title: str
    body: str


class BroadcastResult(BaseModel):
    users_notified: int
    devices_pushed: int

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
    q: str | None = None,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    query = select(Listing).where(Listing.status == status, Listing.deleted_at.is_(None))
    if q:
        query = query.where(Listing.title.ilike(f"%{q}%"))
    result = await db.execute(
        query
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

    # Referral reward: fires once, only on the referred user's FIRST approved
    # listing (not bare signup) — matches the anti-gaming pattern used by
    # Urban Company/OYO. Never blocks the approval itself if anything here fails.
    try:
        referred_result = await db.execute(select(User).where(User.id == listing.user_id))
        referred_user = referred_result.scalar_one_or_none()
        if referred_user and referred_user.referred_by_user_id:
            other_active = await db.scalar(
                select(func.count()).select_from(Listing).where(
                    Listing.user_id == referred_user.id,
                    Listing.status == "active",
                    Listing.id != listing.id,
                    Listing.deleted_at.is_(None),
                )
            )
            if other_active == 0:
                referrer_result = await db.execute(
                    select(User).where(User.id == referred_user.referred_by_user_id)
                )
                referrer = referrer_result.scalar_one_or_none()
                if referrer and referrer.is_active and referrer.referral_rewards_count < REFERRAL_REWARD_CAP:
                    now = datetime.now(timezone.utc)
                    featured_until = now + timedelta(days=REFERRAL_FEATURED_DAYS)

                    listing.is_featured = True
                    listing.featured_at = now
                    listing.featured_until = featured_until

                    referrer_listing_result = await db.execute(
                        select(Listing)
                        .where(
                            Listing.user_id == referrer.id,
                            Listing.status == "active",
                            Listing.deleted_at.is_(None),
                        )
                        .order_by(Listing.created_at.desc())
                        .limit(1)
                    )
                    referrer_listing = referrer_listing_result.scalar_one_or_none()
                    if referrer_listing:
                        referrer_listing.is_featured = True
                        referrer_listing.featured_at = now
                        referrer_listing.featured_until = featured_until

                    referrer.referral_rewards_count += 1
                    await db.commit()
    except Exception:
        pass  # reward is a bonus side-effect; never block the core approve action

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

    # Users — one round trip for the 3 scalar aggregates, one for the by-day series
    # (each was previously its own await db.scalar(), 21 round trips total across this
    # endpoint; conditional COUNT/SUM via FILTER collapses same-table aggregates into
    # a single query without changing any of the returned values)
    users_row = (await db.execute(
        select(
            func.count().filter(User.deleted_at.is_(None)).label("total"),
            func.count().filter(User.deleted_at.is_(None), User.created_at >= today_start).label("new_today"),
            func.count().filter(User.deleted_at.is_(None), User.created_at >= week_start).label("new_7d"),
        )
    )).one()
    new_users_by_day_result = await db.execute(
        select(cast(User.created_at, Date).label("day"), func.count().label("count"))
        .where(User.created_at >= week_start, User.deleted_at.is_(None))
        .group_by(cast(User.created_at, Date))
        .order_by(cast(User.created_at, Date))
    )
    new_users_by_day = [{"date": str(row.day), "count": row.count} for row in new_users_by_day_result]

    # Listings — status breakdown + featured/views/contacts in one query
    listing_row = (await db.execute(
        select(
            func.count().filter(Listing.status == "pending").label("pending"),
            func.count().filter(Listing.status == "active").label("active"),
            func.count().filter(Listing.status == "flagged").label("flagged"),
            func.count().filter(Listing.status == "rejected").label("rejected"),
            func.count().filter(Listing.status == "expired").label("expired"),
            func.count().filter(Listing.status == "fulfilled").label("fulfilled"),
            func.count().label("total"),
            func.count().filter(Listing.is_featured.is_(True), Listing.expires_at > now).label("featured"),
            func.coalesce(func.sum(Listing.view_count), 0).label("total_views"),
            func.coalesce(func.sum(Listing.contact_click_count), 0).label("total_contacts"),
        ).where(Listing.deleted_at.is_(None))
    )).one()

    # Events — pending + active in one query
    events_row = (await db.execute(
        select(
            func.count().filter(Event.status == "pending").label("pending"),
            func.count().filter(Event.status == "active").label("active"),
        ).where(Event.deleted_at.is_(None))
    )).one()

    # Cities — total + with_listings span two tables, so combine as scalar subqueries
    # (still one round trip, the DB evaluates both subqueries server-side)
    cities_row = (await db.execute(
        select(
            select(func.count()).select_from(City).where(City.active.is_(True)).scalar_subquery().label("total"),
            select(func.count(distinct(Listing.city_id))).select_from(Listing)
            .where(Listing.deleted_at.is_(None), Listing.status == "active").scalar_subquery().label("with_listings"),
        )
    )).one()
    top_cities_result = await db.execute(
        select(City.name, City.state, func.count(Listing.id).label("listing_count"))
        .join(Listing, Listing.city_id == City.id)
        .where(Listing.deleted_at.is_(None), Listing.status == "active")
        .group_by(City.id, City.name, City.state)
        .order_by(func.count(Listing.id).desc())
        .limit(15)
    )
    top_cities = [{"name": r.name, "state": r.state, "count": r.listing_count} for r in top_cities_result]

    # OTP — today's total + verified in one query
    otp_row = (await db.execute(
        select(
            func.count().label("total"),
            func.count().filter(OtpRequest.verified.is_(True)).label("verified"),
        ).where(OtpRequest.created_at >= today_start)
    )).one()

    # Content — three different tables, combined as scalar subqueries (one round trip)
    content_row = (await db.execute(
        select(
            select(func.count()).select_from(Report).scalar_subquery().label("reports"),
            select(func.count()).select_from(SavedListing).scalar_subquery().label("saves"),
            select(func.count()).select_from(ListingReview).scalar_subquery().label("reviews"),
        )
    )).one()

    # Referrals — only visibility into the referral system (no dashboard by design)
    referral_row = (await db.execute(
        select(
            func.count().filter(User.referred_by_user_id.isnot(None), User.deleted_at.is_(None)).label("signups"),
            func.coalesce(func.sum(User.referral_rewards_count), 0).label("rewards"),
            func.count().filter(User.referral_rewards_count >= REFERRAL_REWARD_CAP).label("at_cap"),
        )
    )).one()

    return {
        "users": {
            "total": users_row.total or 0,
            "new_today": users_row.new_today or 0,
            "new_7d": users_row.new_7d or 0,
            "new_by_day": new_users_by_day,
        },
        "listings": {
            "total": listing_row.total or 0,
            "pending": listing_row.pending or 0,
            "active": listing_row.active or 0,
            "flagged": listing_row.flagged or 0,
            "rejected": listing_row.rejected or 0,
            "expired": listing_row.expired or 0,
            "fulfilled": listing_row.fulfilled or 0,
            "featured": listing_row.featured or 0,
            "total_views": int(listing_row.total_views or 0),
            "total_contacts": int(listing_row.total_contacts or 0),
        },
        "events": {
            "pending": events_row.pending or 0,
            "active": events_row.active or 0,
        },
        "cities": {
            "total": cities_row.total or 0,
            "with_listings": cities_row.with_listings or 0,
            "top": top_cities,
        },
        "otp": {
            "today_total": otp_row.total or 0,
            "today_verified": otp_row.verified or 0,
        },
        "content": {
            "reports": content_row.reports or 0,
            "saves": content_row.saves or 0,
            "reviews": content_row.reviews or 0,
        },
        "referrals": {
            "signups": referral_row.signups or 0,
            "rewards_granted": int(referral_row.rewards or 0),
            "referrers_at_cap": referral_row.at_cap or 0,
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


@router.get("/banners", response_model=list[CityBannerOut])
async def list_banners_admin(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(CityBanner).order_by(CityBanner.created_at.desc()))
    return result.scalars().all()


@router.post("/banners", response_model=CityBannerOut)
async def create_banner_admin(
    payload: CityBannerCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="End date must be on or after start date.")
    banner = CityBanner(**payload.model_dump())
    db.add(banner)
    await db.commit()
    await db.refresh(banner)
    return banner


@router.delete("/banners/{banner_id}")
async def delete_banner_admin(
    banner_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(CityBanner).where(CityBanner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found.")
    await db.delete(banner)
    await db.commit()
    return {"id": str(banner_id), "deleted": True}


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


@router.get("/buyer-requests")
async def list_buyer_requests_admin(
    status: str = "flagged",
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(BuyerRequest)
        .where(BuyerRequest.status == status, BuyerRequest.deleted_at.is_(None))
        .order_by(BuyerRequest.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    requests = result.scalars().all()
    if not requests:
        return []

    request_ids = [r.id for r in requests]
    reports_result = await db.execute(
        select(BuyerRequestReport)
        .where(BuyerRequestReport.buyer_request_id.in_(request_ids))
        .order_by(BuyerRequestReport.created_at.desc())
    )
    reports_by_request: dict[uuid.UUID, list] = {}
    for rep in reports_result.scalars().all():
        reports_by_request.setdefault(rep.buyer_request_id, []).append({
            "id": str(rep.id),
            "reason": rep.reason,
            "notes": rep.notes,
            "created_at": rep.created_at.isoformat(),
        })

    cat_ids = {r.category_id for r in requests if r.category_id}
    cat_map = {}
    if cat_ids:
        cat_result = await db.execute(select(Category).where(Category.id.in_(cat_ids)))
        cat_map = {c.id: c for c in cat_result.scalars().all()}

    city_ids = {r.city_id for r in requests}
    city_result = await db.execute(select(City).where(City.id.in_(city_ids)))
    city_map = {c.id: c for c in city_result.scalars().all()}

    return [
        {
            "id": str(r.id),
            "description": r.description,
            "budget": r.budget,
            "contact_phone": r.contact_phone,
            "status": r.status,
            "report_count": r.report_count,
            "created_at": r.created_at.isoformat(),
            "city_name": city_map[r.city_id].name if r.city_id in city_map else None,
            "category_name": cat_map[r.category_id].name if r.category_id in cat_map else None,
            "reports": reports_by_request.get(r.id, []),
        }
        for r in requests
    ]


@router.patch("/buyer-requests/{request_id}/restore")
async def restore_buyer_request(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(BuyerRequest).where(BuyerRequest.id == request_id, BuyerRequest.deleted_at.is_(None))
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    req.status = "open"
    req.report_count = 0
    await db.commit()
    return {"message": "Restored."}


@router.post("/tickets/scan", response_model=TicketScanResponse)
async def scan_ticket(
    body: TicketScanRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.event))
        .where(Ticket.qr_token == body.qr_token)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Invalid ticket.")
    if ticket.used_at is not None:
        raise HTTPException(
            status_code=409,
            detail=f"Ticket already used at {ticket.used_at.isoformat()}.",
        )

    ticket.used_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(ticket)

    attendee_result = await db.execute(select(User.name).where(User.id == ticket.user_id))
    attendee_name = attendee_result.scalar_one_or_none()

    return TicketScanResponse(
        status="valid",
        ticket_id=ticket.id,
        event_title=ticket.event.title,
        attendee_name=attendee_name,
        used_at=ticket.used_at,
    )


@router.post("/broadcast", response_model=BroadcastResult)
async def send_broadcast(
    body: BroadcastIn,
    _admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Send an announcement to every device that has the app installed (i.e.
    has a registered push token) - in-app notification for each user plus a
    real push. Not routed through notify() since that sends one push per
    user; this batches all tokens into Expo's push API in chunks of 100
    (Expo's documented per-request limit)."""
    from app.models.device_token import DeviceToken
    from app.models.user_notification import UserNotification
    from app.services.push_svc import send_push

    rows = (await db.execute(select(DeviceToken.user_id, DeviceToken.token))).all()
    tokens = [token for _, token in rows]
    user_ids = {user_id for user_id, _ in rows}

    for user_id in user_ids:
        db.add(UserNotification(user_id=user_id, type="admin_broadcast", title=body.title, body=body.body))
    await db.commit()

    for i in range(0, len(tokens), 100):
        await send_push(tokens[i:i + 100], body.title, body.body, {"type": "admin_broadcast"})

    return BroadcastResult(users_notified=len(user_ids), devices_pushed=len(tokens))


# The marketing agents (social poster, blog publisher) run on ephemeral
# GitHub Actions runners and write their activity logs into the repo, not
# into this app's own database — there's no other durable record of what's
# been posted/published. Reading the repo's raw files over HTTP is simpler
# than teaching every agent to call back into this API, and the repo is
# public so no token is needed.
_GITHUB_RAW_BASE = "https://raw.githubusercontent.com/rajeshguntupalli59/localsindia/master"
_activity_cache: dict = {"data": None, "fetched_at": 0.0}
_ACTIVITY_CACHE_TTL_SECONDS = 300


async def _fetch_raw(client: httpx.AsyncClient, path: str) -> str | None:
    resp = await client.get(f"{_GITHUB_RAW_BASE}/{path}", timeout=10.0)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.text


@router.get("/activity-feed")
async def get_activity_feed(_admin: User = Depends(get_current_admin)):
    """Merged, newest-first feed of marketing/content activity: Facebook/
    Instagram posts and blog articles. Purely informational (no $ cost here -
    posting and blog generation are free); the LLM usage that costs real
    money is tracked separately."""
    import time

    now = time.time()
    if _activity_cache["data"] is not None and now - _activity_cache["fetched_at"] < _ACTIVITY_CACHE_TTL_SECONDS:
        return _activity_cache["data"]

    items: list[dict] = []
    async with httpx.AsyncClient() as client:
        social_log, ecosystem_log, blog_state = await asyncio.gather(
            _fetch_raw(client, "agents/output/social_posts_log.jsonl"),
            _fetch_raw(client, "agents/output/ecosystem_posts_log.jsonl"),
            _fetch_raw(client, "agents/state/blog_rotation.json"),
            return_exceptions=True,
        )

    if isinstance(social_log, str):
        for line in social_log.splitlines():
            if not line.strip():
                continue
            entry = json.loads(line)
            items.append({
                "type": "social_post",
                "timestamp": entry.get("timestamp"),
                "title": entry.get("headline") or entry.get("topic", "Post"),
                "detail": entry.get("format", "image"),
                "facebook_post_id": entry.get("facebook_post_id"),
                "instagram_feed_id": entry.get("instagram_feed_id"),
            })

    if isinstance(ecosystem_log, str):
        for line in ecosystem_log.splitlines():
            if not line.strip():
                continue
            entry = json.loads(line)
            items.append({
                "type": "ecosystem_post",
                "timestamp": entry.get("timestamp"),
                "title": entry.get("tagline", "Ecosystem post"),
                "detail": ", ".join(entry.get("benefit_keys", [])),
                "facebook_post_id": entry.get("facebook_post_id"),
                "instagram_feed_id": entry.get("instagram_feed_id"),
            })

    if isinstance(blog_state, str):
        state = json.loads(blog_state)
        for entry in state.get("history", []):
            items.append({
                "type": "blog_article",
                "timestamp": entry.get("publishedAt"),
                "title": f"{entry.get('citySlug', '')} — {entry.get('category', '')}".strip(" —"),
                "detail": entry.get("topicTemplateId"),
            })

    items.sort(key=lambda i: i.get("timestamp") or "", reverse=True)
    result = items[:50]

    _activity_cache["data"] = result
    _activity_cache["fetched_at"] = now
    return result


_llm_usage_cache: dict = {"data": None, "fetched_at": 0.0}


@router.get("/llm-usage")
async def get_llm_usage(db: AsyncSession = Depends(get_db), _admin: User = Depends(get_current_admin)):
    """Real $ cost side of the spending dashboard (Tier B) - Gemini (chatbot,
    logged straight to this DB from chat.py) and Claude (all 14 marketing
    agents, logged to a file since they run on CI runners with no DB access -
    see base_agent.py's generate()). Both are estimates based on manually-
    maintained per-token pricing constants, not a live-fetched invoice."""
    import time

    now = time.time()
    if _llm_usage_cache["data"] is not None and now - _llm_usage_cache["fetched_at"] < _ACTIVITY_CACHE_TTL_SECONDS:
        return _llm_usage_cache["data"]

    gemini_totals_row = (await db.execute(
        select(
            func.count(LlmUsageLog.id),
            func.coalesce(func.sum(LlmUsageLog.input_tokens), 0),
            func.coalesce(func.sum(LlmUsageLog.output_tokens), 0),
            func.coalesce(func.sum(LlmUsageLog.estimated_cost_usd), 0),
        ).where(LlmUsageLog.provider == "gemini")
    )).one()
    gemini_calls, gemini_in, gemini_out, gemini_cost = gemini_totals_row

    recent_gemini_rows = (await db.execute(
        select(LlmUsageLog).where(LlmUsageLog.provider == "gemini").order_by(LlmUsageLog.created_at.desc()).limit(50)
    )).scalars().all()
    recent = [
        {
            "provider": "gemini",
            "context": row.context,
            "model": row.model,
            "input_tokens": row.input_tokens,
            "output_tokens": row.output_tokens,
            "estimated_cost_usd": float(row.estimated_cost_usd),
            "timestamp": row.created_at.isoformat(),
        }
        for row in recent_gemini_rows
    ]

    claude_calls, claude_in, claude_out, claude_cost = 0, 0, 0, 0.0
    async with httpx.AsyncClient() as client:
        claude_log = await _fetch_raw(client, "agents/output/llm_usage_log.jsonl")

    if isinstance(claude_log, str):
        for line in claude_log.splitlines():
            if not line.strip():
                continue
            entry = json.loads(line)
            claude_calls += 1
            claude_in += entry.get("input_tokens", 0)
            claude_out += entry.get("output_tokens", 0)
            claude_cost += entry.get("estimated_cost_usd", 0)
            recent.append({
                "provider": "claude",
                "context": entry.get("agent"),
                "model": entry.get("model"),
                "input_tokens": entry.get("input_tokens", 0),
                "output_tokens": entry.get("output_tokens", 0),
                "estimated_cost_usd": entry.get("estimated_cost_usd", 0),
                "timestamp": entry.get("timestamp"),
            })

    recent.sort(key=lambda i: i.get("timestamp") or "", reverse=True)

    result = {
        "totals": {
            "gemini": {"calls": gemini_calls, "input_tokens": gemini_in, "output_tokens": gemini_out, "cost_usd": round(float(gemini_cost), 4)},
            "claude": {"calls": claude_calls, "input_tokens": claude_in, "output_tokens": claude_out, "cost_usd": round(claude_cost, 4)},
            "combined_cost_usd": round(float(gemini_cost) + claude_cost, 4),
        },
        "recent": recent[:50],
    }

    _llm_usage_cache["data"] = result
    _llm_usage_cache["fetched_at"] = now
    return result
