import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

from app.core.config import settings

CRON_SECRET = "test_cron_secret"


# Regression test for a real production bug: a listing promoted for a "week"
# stayed featured forever because nothing ever checked whether the featured
# window had passed. The cron job now un-features listings past their
# featured_until, the same way it already expired business badges.
@pytest.mark.asyncio
async def test_cron_unfeatures_listings_past_featured_until(client, db, auth_client, city, category):
    from sqlalchemy import select
    from app.models.listing import Listing

    ac, _user = auth_client
    now = datetime.now(timezone.utc)

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Expired featured listing",
        "description": "Featured window passed 2 days ago, should un-feature",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one()
    listing.is_featured = True
    listing.featured_at = now - timedelta(days=9)
    listing.featured_until = now - timedelta(days=2)
    await db.commit()

    with patch.object(settings, "CRON_SECRET", CRON_SECRET):
        resp = await client.get(f"/api/v1/cron/expiry-reminders?secret={CRON_SECRET}")
    assert resp.status_code == 200
    assert resp.json()["featured_expired"] == 1

    db.expire_all()
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    assert result.scalar_one().is_featured is False


@pytest.mark.asyncio
async def test_cron_leaves_still_featured_listings_alone(client, db, auth_client, city, category):
    from sqlalchemy import select
    from app.models.listing import Listing

    ac, _user = auth_client
    now = datetime.now(timezone.utc)

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Still-active featured listing",
        "description": "Featured window has 5 days left, should stay featured",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one()
    listing.is_featured = True
    listing.featured_at = now - timedelta(days=2)
    listing.featured_until = now + timedelta(days=5)
    await db.commit()

    with patch.object(settings, "CRON_SECRET", CRON_SECRET):
        resp = await client.get(f"/api/v1/cron/expiry-reminders?secret={CRON_SECRET}")
    assert resp.status_code == 200
    assert resp.json()["featured_expired"] == 0

    db.expire_all()
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    assert result.scalar_one().is_featured is True


@pytest.mark.asyncio
async def test_cron_requires_correct_secret(client):
    with patch.object(settings, "CRON_SECRET", CRON_SECRET):
        resp = await client.get("/api/v1/cron/expiry-reminders?secret=wrong")
    assert resp.status_code == 403
