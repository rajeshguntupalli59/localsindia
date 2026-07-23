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


# Regression test for a real production bug: listings past their expires_at
# stayed status='active' forever — nothing ever flipped them, so owners saw a
# green "Active" badge on an already-invisible listing with no way to know.
@pytest.mark.asyncio
async def test_cron_expires_listing_past_due_date(client, db, auth_client, city, category):
    from sqlalchemy import select
    from app.models.listing import Listing

    ac, _user = auth_client
    now = datetime.now(timezone.utc)

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Listing whose 30 days are already up",
        "description": "expires_at passed 2 days ago but status never flipped",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one()
    listing.status = "active"
    listing.expires_at = now - timedelta(days=2)
    await db.commit()

    with patch.object(settings, "CRON_SECRET", CRON_SECRET):
        resp = await client.get(f"/api/v1/cron/expiry-reminders?secret={CRON_SECRET}")
    assert resp.status_code == 200
    assert resp.json()["listings_expired"] == 1

    db.expire_all()
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    assert result.scalar_one().status == "expired"

    from app.models.user_notification import UserNotification
    notif_result = await db.execute(
        select(UserNotification).where(
            UserNotification.listing_id == listing_id,
            UserNotification.type == "listing_expired",
        )
    )
    assert notif_result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_cron_leaves_not_yet_expired_listing_active(client, db, auth_client, city, category):
    from sqlalchemy import select
    from app.models.listing import Listing

    ac, _user = auth_client
    now = datetime.now(timezone.utc)

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Listing with 20 days left",
        "description": "Should be untouched by the expiry sweep",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one()
    listing.status = "active"
    listing.expires_at = now + timedelta(days=20)
    await db.commit()

    with patch.object(settings, "CRON_SECRET", CRON_SECRET):
        resp = await client.get(f"/api/v1/cron/expiry-reminders?secret={CRON_SECRET}")
    assert resp.status_code == 200
    assert resp.json()["listings_expired"] == 0

    db.expire_all()
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    assert result.scalar_one().status == "active"


# Regression test: the pre-expiry reminder used to require the owner to have an
# email on file (this app signs up via phone+OTP only, so most users have none)
# and only ever sent an email — no in-app notification. Now it always sends the
# in-app notification, and only emails if the owner happens to have one.
@pytest.mark.asyncio
async def test_cron_sends_in_app_expiring_soon_notice_without_email(client, db, auth_client, city, category):
    from sqlalchemy import select
    from app.models.listing import Listing
    from app.models.user_notification import UserNotification

    ac, _user = auth_client
    now = datetime.now(timezone.utc)

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Listing expiring in 2 days",
        "description": "Owner has no email — must still get the in-app ping",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one()
    listing.status = "active"
    listing.expires_at = now + timedelta(days=2)
    await db.commit()

    with patch.object(settings, "CRON_SECRET", CRON_SECRET):
        resp = await client.get(f"/api/v1/cron/expiry-reminders?secret={CRON_SECRET}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["listing_reminder_notifs_sent"] == 1
    assert body["listing_reminders_sent"] == 0  # no email on file for this test user

    notif_result = await db.execute(
        select(UserNotification).where(
            UserNotification.listing_id == listing_id,
            UserNotification.type == "listing_expiring",
        )
    )
    assert notif_result.scalar_one_or_none() is not None


# Regression coverage for a real product gap: onboarding asked users to pick a
# daily/weekly digest frequency but never collected an email, and the
# email-sending function was never called from anywhere - doubly dead. Fixed
# by dropping the email choice and delivering via push instead, since device
# tokens + a working send_push() already exist. These tests cover the new
# interest-matching push digest cron.
@pytest.mark.asyncio
async def test_interest_digest_notifies_matching_daily_user(client, db, auth_client, city, category):
    from sqlalchemy import select
    from app.models.listing import Listing
    from app.models.user_preference import UserPreference
    from app.models.user_notification import UserNotification

    ac, user = auth_client

    pref = UserPreference(user_id=user.id, interests=[category.slug], alert_frequency="daily", push_enabled=True)
    db.add(pref)
    await db.commit()

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "New listing matching this user's interest",
        "description": "Posted just now, should be picked up by the daily digest",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one()
    listing.status = "active"  # new listings default to 'pending' (BL-11) - digest only counts active
    await db.commit()

    with patch.object(settings, "CRON_SECRET", CRON_SECRET):
        resp = await client.get(f"/api/v1/cron/interest-digest?secret={CRON_SECRET}&frequency=daily")
    assert resp.status_code == 200
    body = resp.json()
    assert body["users_notified"] == 1
    assert body["new_listings_in_window"] >= 1  # global count across all categories, not just this test's

    notif_result = await db.execute(
        select(UserNotification).where(
            UserNotification.user_id == user.id,
            UserNotification.type == "interest_digest",
        )
    )
    assert notif_result.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_interest_digest_skips_non_matching_category(client, db, auth_client, city, category):
    from sqlalchemy import select
    from app.models.listing import Listing
    from app.models.user_preference import UserPreference
    from app.models.user_notification import UserNotification

    ac, user = auth_client

    # User is only interested in an unrelated category - the listing below doesn't match.
    pref = UserPreference(user_id=user.id, interests=["some-other-category-nobody-picked"], alert_frequency="daily", push_enabled=True)
    db.add(pref)
    await db.commit()

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Listing in an unrelated category",
        "description": "User didn't pick this category as an interest",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one()
    listing.status = "active"
    await db.commit()

    with patch.object(settings, "CRON_SECRET", CRON_SECRET):
        resp = await client.get(f"/api/v1/cron/interest-digest?secret={CRON_SECRET}&frequency=daily")
    assert resp.status_code == 200

    # Scoped to this test's own user - the aggregate users_notified count isn't
    # reliable here since earlier tests in this file leave their own matching
    # "daily" users + active listings in the shared test DB.
    notif_result = await db.execute(
        select(UserNotification).where(
            UserNotification.user_id == user.id,
            UserNotification.type == "interest_digest",
        )
    )
    assert notif_result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_interest_digest_skips_wrong_frequency_bucket(client, db, auth_client, city, category):
    from sqlalchemy import select
    from app.models.listing import Listing
    from app.models.user_preference import UserPreference
    from app.models.user_notification import UserNotification

    ac, user = auth_client

    # User opted into "weekly" - a "daily" run should never notify them.
    pref = UserPreference(user_id=user.id, interests=[category.slug], alert_frequency="weekly", push_enabled=True)
    db.add(pref)
    await db.commit()

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Matches interest but user is weekly, not daily",
        "description": "A daily run should skip this user entirely",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one()
    listing.status = "active"
    await db.commit()

    with patch.object(settings, "CRON_SECRET", CRON_SECRET):
        resp = await client.get(f"/api/v1/cron/interest-digest?secret={CRON_SECRET}&frequency=daily")
    assert resp.status_code == 200

    notif_result = await db.execute(
        select(UserNotification).where(
            UserNotification.user_id == user.id,
            UserNotification.type == "interest_digest",
        )
    )
    assert notif_result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_interest_digest_skips_push_disabled_user(client, db, auth_client, city, category):
    from sqlalchemy import select
    from app.models.listing import Listing
    from app.models.user_preference import UserPreference
    from app.models.user_notification import UserNotification

    ac, user = auth_client

    pref = UserPreference(user_id=user.id, interests=[category.slug], alert_frequency="daily", push_enabled=False)
    db.add(pref)
    await db.commit()

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Matches interest but user disabled push",
        "description": "push_enabled=False should be respected",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one()
    listing.status = "active"
    await db.commit()

    with patch.object(settings, "CRON_SECRET", CRON_SECRET):
        resp = await client.get(f"/api/v1/cron/interest-digest?secret={CRON_SECRET}&frequency=daily")
    assert resp.status_code == 200

    notif_result = await db.execute(
        select(UserNotification).where(
            UserNotification.user_id == user.id,
            UserNotification.type == "interest_digest",
        )
    )
    assert notif_result.scalar_one_or_none() is None
