"""
Cron endpoints called by GitHub Actions on a schedule.
All endpoints are protected by CRON_SECRET — a shared secret set as an Azure
env var and a GitHub Actions secret. Requests without the correct secret get 403.
"""
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.listing import Listing
from app.models.user import User

router = APIRouter(prefix="/api/v1/cron", tags=["cron"])

EXPIRY_WARN_DAYS = 3  # send reminder when this many days remain


def _check_secret(secret: str = Query(...)) -> None:
    if not settings.CRON_SECRET:
        raise HTTPException(status_code=503, detail="Cron not configured (CRON_SECRET not set).")
    if secret != settings.CRON_SECRET:
        raise HTTPException(status_code=403, detail="Invalid cron secret.")


@router.get("/expiry-reminders")
async def send_expiry_reminders(
    _: None = Depends(_check_secret),
    db: AsyncSession = Depends(get_db),
):
    """
    Find active listings expiring within EXPIRY_WARN_DAYS and email their owners.
    Also expires business badges that have passed their badge_expires_at date,
    and un-features listings whose paid featured-boost window has passed.
    Called daily by GitHub Actions at 9am IST (3:30am UTC).
    """
    from app.services.email_svc import send_listing_expiry_email
    from app.models.business import Business

    now = datetime.now(timezone.utc)
    warn_cutoff = now + timedelta(days=EXPIRY_WARN_DAYS)

    # --- Listing expiry reminders ---
    result = await db.execute(
        select(Listing, User)
        .join(User, User.id == Listing.user_id)
        .where(
            Listing.status == "active",
            Listing.deleted_at.is_(None),
            Listing.expires_at > now,
            Listing.expires_at <= warn_cutoff,
            User.email.isnot(None),
            User.deleted_at.is_(None),
        )
    )
    rows = result.all()

    listing_emails_sent = 0
    for listing, owner in rows:
        renew_url = f"https://localsindia.com/profile/listings/{listing.id}"
        try:
            await send_listing_expiry_email(
                to=owner.email,
                listing_title=listing.title,
                renew_url=renew_url,
                days_left=max(1, (listing.expires_at - now).days),
            )
            listing_emails_sent += 1
        except Exception:
            pass

    # --- Business badge expiry ---
    badge_result = await db.execute(
        select(Business).where(
            Business.verified.is_(True),
            Business.badge_expires_at.isnot(None),
            Business.badge_expires_at < now,
            Business.deleted_at.is_(None),
        )
    )
    expired_businesses = badge_result.scalars().all()
    badges_expired = 0
    for biz in expired_businesses:
        biz.verified = False
        biz.badge_plan = None
        biz.badge_expires_at = None
        badges_expired += 1

    # --- Featured-listing boost expiry ---
    featured_result = await db.execute(
        select(Listing).where(
            Listing.is_featured.is_(True),
            Listing.featured_until.isnot(None),
            Listing.featured_until < now,
            Listing.deleted_at.is_(None),
        )
    )
    expired_featured_listings = featured_result.scalars().all()
    featured_expired = 0
    for listing in expired_featured_listings:
        listing.is_featured = False
        featured_expired += 1

    if badges_expired or featured_expired:
        await db.commit()

    return {
        "listing_reminders_sent": listing_emails_sent,
        "listings_checked": len(rows),
        "badges_expired": badges_expired,
        "featured_expired": featured_expired,
        "ran_at": now.isoformat(),
    }
