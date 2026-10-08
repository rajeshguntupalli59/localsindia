"""Launch-phase expiry pause: while the site has fewer than
settings.LISTING_EXPIRY_MIN_ACTIVE active listings, listings don't expire —
every scarce real listing stays visible. Once there are enough, the normal
30-day expiry (routers/cron.py) switches back on by itself.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.listing import Listing

LISTING_LIFETIME_DAYS = 30


async def active_listing_count(db: AsyncSession) -> int:
    return (await db.execute(
        select(func.count()).select_from(Listing).where(Listing.status == "active", Listing.deleted_at.is_(None))
    )).scalar() or 0


async def expiry_status(db: AsyncSession) -> dict:
    active = await active_listing_count(db)
    return {
        "expiry_paused": active < settings.LISTING_EXPIRY_MIN_ACTIVE,
        "active_listings": active,
        "min_active_listings": settings.LISTING_EXPIRY_MIN_ACTIVE,
    }


async def keep_listings_alive(db: AsyncSession) -> int:
    """While paused: push every live or awaiting-review listing's expires_at a
    full lifetime ahead, so none reaches its expiry or the 'expiring soon'
    window. Returns how many rows moved."""
    target = datetime.now(timezone.utc) + timedelta(days=LISTING_LIFETIME_DAYS)
    result = await db.execute(
        update(Listing)
        .where(Listing.status.in_(["active", "pending"]), Listing.deleted_at.is_(None),
               Listing.expires_at < target - timedelta(days=1))
        .values(expires_at=target)
    )
    await db.commit()
    return result.rowcount or 0
