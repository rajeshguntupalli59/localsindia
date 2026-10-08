"""Launch-phase expiry pause (services/listing_expiry.py): below the active-
listing threshold nothing expires; at or above it, normal expiry resumes."""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from sqlalchemy import select

from app.core.config import settings

CRON_SECRET = "test_cron_secret"


async def _overdue_listing(ac, db, city, category, title):
    from app.models.listing import Listing
    r = await ac.post("/api/v1/listings", json={
        "title": title, "description": "Posted long ago, past its expiry date",
        "category_id": str(category.id), "city_id": str(city.id), "contact_phone": "+919876543210",
    })
    listing = (await db.execute(select(Listing).where(Listing.id == r.json()["id"]))).scalar_one()
    listing.status = "active"
    listing.expires_at = datetime.now(timezone.utc) - timedelta(days=2)
    await db.commit()
    return listing.id


async def _run_cron(client):
    with patch.object(settings, "CRON_SECRET", CRON_SECRET):
        r = await client.get(f"/api/v1/cron/expiry-reminders?secret={CRON_SECRET}")
    assert r.status_code == 200
    return r.json()


@pytest.mark.asyncio
async def test_paused_listings_never_expire(client, db, auth_client, city, category, monkeypatch):
    from app.models.listing import Listing
    from app.models.user_notification import UserNotification
    monkeypatch.setattr(settings, "LISTING_EXPIRY_MIN_ACTIVE", 1000)
    ac, _ = auth_client
    lid = await _overdue_listing(ac, db, city, category, "Old sofa that must stay live")

    body = await _run_cron(client)
    assert body["expiry_paused"] is True
    assert body["listings_expired"] == 0
    assert body["listings_extended"] >= 1

    db.expire_all()
    listing = (await db.execute(select(Listing).where(Listing.id == lid))).scalar_one()
    assert listing.status == "active"
    assert listing.expires_at > datetime.now(timezone.utc) + timedelta(days=29)
    notes = (await db.execute(select(UserNotification).where(UserNotification.listing_id == lid))).scalars().all()
    assert not [n for n in notes if n.type in ("listing_expired", "listing_expiring")]


@pytest.mark.asyncio
async def test_expiry_resumes_at_threshold(client, db, auth_client, city, category, monkeypatch):
    from app.models.listing import Listing
    monkeypatch.setattr(settings, "LISTING_EXPIRY_MIN_ACTIVE", 1)   # we have 1+ active → not paused
    ac, _ = auth_client
    lid = await _overdue_listing(ac, db, city, category, "Listing past due after launch phase")

    body = await _run_cron(client)
    assert body["expiry_paused"] is False
    assert body["listings_extended"] == 0
    db.expire_all()
    assert (await db.execute(select(Listing).where(Listing.id == lid))).scalar_one().status == "expired"


@pytest.mark.asyncio
async def test_expiry_policy_endpoint(client, monkeypatch):
    monkeypatch.setattr(settings, "LISTING_EXPIRY_MIN_ACTIVE", 1000)
    r = await client.get("/api/v1/listings/expiry-policy")
    assert r.status_code == 200
    body = r.json()
    assert body["expiry_paused"] is True and body["min_active_listings"] == 1000
    assert isinstance(body["active_listings"], int)
    monkeypatch.setattr(settings, "LISTING_EXPIRY_MIN_ACTIVE", 0)
    assert (await client.get("/api/v1/listings/expiry-policy")).json()["expiry_paused"] is False
