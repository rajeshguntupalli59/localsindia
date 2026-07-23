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
from app.models.category import Category
from app.models.listing import Listing
from app.models.user import User
from app.models.user_preference import UserPreference

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
    Find active listings expiring within EXPIRY_WARN_DAYS and notify their owners
    (in-app always, email if they have one on file). Also flips listings whose
    expires_at has already passed to status='expired' and notifies the owner,
    expires business badges past badge_expires_at, and un-features listings whose
    paid featured-boost window has passed.
    Called daily by GitHub Actions at 9am IST (3:30am UTC).
    """
    from app.services.email_svc import send_listing_expiry_email
    from app.services.notification_svc import notify
    from app.models.business import Business

    now = datetime.now(timezone.utc)
    warn_cutoff = now + timedelta(days=EXPIRY_WARN_DAYS)

    # --- Listing expiry reminders (in-app notification always; email if on file) ---
    result = await db.execute(
        select(Listing, User)
        .join(User, User.id == Listing.user_id)
        .where(
            Listing.status == "active",
            Listing.deleted_at.is_(None),
            Listing.expires_at > now,
            Listing.expires_at <= warn_cutoff,
            User.deleted_at.is_(None),
        )
    )
    rows = result.all()

    listing_emails_sent = 0
    listing_notifs_sent = 0
    for listing, owner in rows:
        renew_url = f"https://localsindia.com/profile/listings/{listing.id}"
        days_left = max(1, (listing.expires_at - now).days)
        try:
            await notify(
                db, listing.user_id, "listing_expiring",
                f"Your listing expires in {days_left} day{'s' if days_left != 1 else ''}",
                "Renew now to stay visible to buyers in your city.",
                renew_url, listing.id,
            )
            listing_notifs_sent += 1
        except Exception:
            pass
        if owner.email:
            try:
                await send_listing_expiry_email(
                    to=owner.email,
                    listing_title=listing.title,
                    renew_url=renew_url,
                    days_left=days_left,
                )
                listing_emails_sent += 1
            except Exception:
                pass

    # --- Flip past-due active listings to 'expired' and notify owners ---
    expired_result = await db.execute(
        select(Listing).where(
            Listing.status == "active",
            Listing.deleted_at.is_(None),
            Listing.expires_at <= now,
        )
    )
    newly_expired = expired_result.scalars().all()
    for listing in newly_expired:
        listing.status = "expired"
    if newly_expired:
        await db.commit()
    for listing in newly_expired:
        try:
            await notify(
                db, listing.user_id, "listing_expired",
                f"Your listing has expired — {listing.title[:60]}",
                "It's no longer visible to buyers. Renew it to bring it back.",
                f"https://localsindia.com/profile/listings/{listing.id}",
                listing.id,
            )
        except Exception:
            pass
    listings_expired = len(newly_expired)

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
        "listing_reminder_notifs_sent": listing_notifs_sent,
        "listings_checked": len(rows),
        "listings_expired": listings_expired,
        "badges_expired": badges_expired,
        "featured_expired": featured_expired,
        "ran_at": now.isoformat(),
    }


@router.get("/interest-digest")
async def send_interest_digest(
    frequency: str = Query(..., pattern="^(daily|weekly)$"),
    _: None = Depends(_check_secret),
    db: AsyncSession = Depends(get_db),
):
    """
    Push a digest to users who chose "daily" or "weekly" alerts during
    onboarding, summarizing new active listings (since the last window) in
    the categories they marked as interests. Delivered via the existing push
    infrastructure (notify() -> in-app UserNotification + Expo push) - not
    email, since most users have no email on file (see [[localindia-project]]
    session notes on why the email-digest choice was dropped instead).

    Known limitation: not scoped by city - onboarding never collects one
    (UserPreference.city_prefs exists but is never populated anywhere), so a
    user could get notified about a matching category in a city they don't
    care about. Fine for now given the user base size; revisit if it becomes
    noisy.

    Called by GitHub Actions: daily at 9am IST for "daily" users, weekly
    (Monday) 9am IST for "weekly" users.
    """
    from app.services.notification_svc import notify

    now = datetime.now(timezone.utc)
    window_start = now - (timedelta(days=1) if frequency == "daily" else timedelta(days=7))

    listing_rows = await db.execute(
        select(Listing.id, Listing.title, Category.slug)
        .join(Category, Category.id == Listing.category_id)
        .where(
            Listing.status == "active",
            Listing.deleted_at.is_(None),
            Listing.created_at >= window_start,
        )
    )
    listings_by_category: dict[str, list[tuple]] = {}
    for listing_id, title, slug in listing_rows.all():
        listings_by_category.setdefault(slug, []).append((listing_id, title))

    if not listings_by_category:
        return {"users_notified": 0, "new_listings_in_window": 0, "frequency": frequency, "ran_at": now.isoformat()}

    pref_rows = await db.execute(
        select(UserPreference).where(
            UserPreference.alert_frequency == frequency,
            UserPreference.push_enabled.is_(True),
            UserPreference.interests.isnot(None),
        )
    )
    prefs = pref_rows.scalars().all()

    users_notified = 0
    for pref in prefs:
        if not pref.interests:
            continue
        matches = [item for slug in pref.interests for item in listings_by_category.get(slug, [])]
        if not matches:
            continue
        count = len(matches)
        titles_preview = ", ".join(title for _, title in matches[:3])
        try:
            await notify(
                db, pref.user_id, "interest_digest",
                f"{count} new listing{'s' if count != 1 else ''} matching your interests",
                titles_preview + ("..." if count > 3 else ""),
                "https://localsindia.com",
            )
            users_notified += 1
        except Exception:
            pass

    return {
        "users_notified": users_notified,
        "new_listings_in_window": sum(len(v) for v in listings_by_category.values()),
        "frequency": frequency,
        "ran_at": now.isoformat(),
    }
