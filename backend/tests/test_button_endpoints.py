"""
Coverage for app buttons whose endpoints had no test (button audit 2026-10-25):
favorites, notifications, preferences, saved searches, listing views/trending,
event list/delete, business delete, admin businesses/events tabs, token refresh,
seller public profile, dev-login guard.
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta


async def _active_listing(ac, admin_ac, city, category, title="Button audit listing"):
    resp = await ac.post("/api/v1/listings", json={
        "title": title,
        "description": "Created by the button audit tests",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    assert resp.status_code == 201, resp.text
    listing_id = resp.json()["id"]
    assert (await admin_ac.patch(f"/api/v1/admin/listings/{listing_id}/approve")).status_code == 200
    return listing_id


# â”€â”€ Favorites (heart button) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@pytest.mark.asyncio
async def test_favorite_toggle_list_ids_count(auth_client, admin_client, city, category):
    ac, _user = auth_client
    admin_ac, _admin = admin_client
    listing_id = await _active_listing(ac, admin_ac, city, category)

    assert (await ac.post(f"/api/v1/favorites/{listing_id}")).json() == {"saved": True}
    assert listing_id in (await ac.get("/api/v1/favorites/ids")).json()
    assert listing_id in [l["id"] for l in (await ac.get("/api/v1/favorites")).json()]
    assert (await ac.get(f"/api/v1/favorites/count/{listing_id}")).json() == {"count": 1}

    assert (await ac.post(f"/api/v1/favorites/{listing_id}")).json() == {"saved": False}
    assert listing_id not in (await ac.get("/api/v1/favorites/ids")).json()
    assert (await ac.get(f"/api/v1/favorites/count/{listing_id}")).json() == {"count": 0}


# â”€â”€ Notifications (bell) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@pytest.mark.asyncio
async def test_notifications_unread_count_and_mark_read(auth_client, db):
    from app.models.user_notification import UserNotification
    ac, user = auth_client
    for i in range(2):
        db.add(UserNotification(user_id=user.id, type="broadcast", title=f"Hello {i}", body="test"))
    await db.commit()

    assert (await ac.get("/api/v1/notifications/unread-count")).json() == {"count": 2}
    first_id = (await ac.get("/api/v1/notifications")).json()[0]["id"]
    assert (await ac.post(f"/api/v1/notifications/read/{first_id}")).status_code == 200
    assert (await ac.get("/api/v1/notifications/unread-count")).json() == {"count": 1}
    assert (await ac.post("/api/v1/notifications/read-all")).status_code == 200
    assert (await ac.get("/api/v1/notifications/unread-count")).json() == {"count": 0}


# â”€â”€ Preferences (onboarding / alert settings) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@pytest.mark.asyncio
async def test_preferences_save_and_load(auth_client):
    ac, _user = auth_client
    assert (await ac.get("/api/v1/preferences")).json()["onboarding_done"] is False
    resp = await ac.post("/api/v1/preferences", json={
        "interests": ["jobs"], "email_frequency": "weekly", "onboarding_done": True,
    })
    assert resp.status_code == 200, resp.text
    got = (await ac.get("/api/v1/preferences")).json()
    assert got["interests"] == ["jobs"]
    assert got["alert_frequency"] == "weekly"  # mobile's email_frequency alias is stored
    assert got["onboarding_done"] is True


# â”€â”€ Saved searches â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@pytest.mark.asyncio
async def test_saved_search_create_list_duplicate_delete(auth_client, city):
    ac, _user = auth_client
    body = {"city_slug": city.slug, "query_text": "tiffin"}
    created = await ac.post("/api/v1/saved-searches", json=body)
    assert created.status_code == 201, created.text
    sid = created.json()["id"]
    assert (await ac.post("/api/v1/saved-searches", json=body)).status_code == 409
    assert sid in [s["id"] for s in (await ac.get("/api/v1/saved-searches")).json()]
    assert (await ac.delete(f"/api/v1/saved-searches/{sid}")).status_code == 204
    assert sid not in [s["id"] for s in (await ac.get("/api/v1/saved-searches")).json()]
    assert (await ac.delete(f"/api/v1/saved-searches/{sid}")).status_code == 404


# â”€â”€ Listing view counter, today-count, trending â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@pytest.mark.asyncio
async def test_listing_view_today_count_trending(client, auth_client, admin_client, city, category):
    ac, _user = auth_client
    admin_ac, _admin = admin_client
    listing_id = await _active_listing(ac, admin_ac, city, category, "Trending audit listing")

    assert (await client.post(f"/api/v1/listings/{listing_id}/view")).status_code in (200, 204)
    today = await client.get(f"/api/v1/cities/{city.slug}/listings/today-count")
    assert today.status_code == 200 and today.json()["count"] >= 1
    trending = await client.get(f"/api/v1/cities/{city.slug}/listings/trending")
    assert trending.status_code == 200 and isinstance(trending.json(), list)


# â”€â”€ Events: public list + delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@pytest.mark.asyncio
async def test_event_list_and_owner_delete(client, auth_client, admin_client, city, category):
    ac, _user = auth_client
    admin_ac, _admin = admin_client
    created = await ac.post("/api/v1/events", json={
        "title": "Audit event",
        "description": "Button audit",
        "venue": "Community Hall",
        "event_date": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
        "city_id": str(city.id),
        "category_id": str(category.id),
        "is_free": True,
    })
    assert created.status_code == 201, created.text
    event_id = created.json()["id"]
    assert (await admin_ac.patch(f"/api/v1/admin/events/{event_id}/approve")).status_code == 200

    listed = await client.get(f"/api/v1/events?city_slug={city.slug}")
    assert listed.status_code == 200 and event_id in [e["id"] for e in listed.json()]
    admin_tab = await admin_ac.get("/api/v1/admin/events?status=active")
    assert admin_tab.status_code == 200 and event_id in [e["id"] for e in admin_tab.json()]

    assert (await ac.delete(f"/api/v1/events/{event_id}")).status_code in (200, 204)
    listed = await client.get(f"/api/v1/events?city_slug={city.slug}")
    assert event_id not in [e["id"] for e in listed.json()]


# â”€â”€ Businesses: admin tab, verify/unverify, owner delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@pytest.mark.asyncio
async def test_business_admin_verify_and_delete(client, auth_client, admin_client, city):
    ac, _user = auth_client
    admin_ac, _admin = admin_client
    created = await ac.post("/api/v1/businesses", json={"name": "Audit Business", "city_id": str(city.id)})
    assert created.status_code == 201, created.text
    biz_id = created.json()["id"]

    tab = await admin_ac.get(f"/api/v1/admin/businesses?q=Audit Business")
    assert tab.status_code == 200
    assert (await admin_ac.patch(f"/api/v1/admin/businesses/{biz_id}/verify")).status_code == 200
    assert (await client.get(f"/api/v1/businesses/{biz_id}")).json()["verified"] is True
    assert (await admin_ac.delete(f"/api/v1/admin/businesses/{biz_id}/verify")).status_code == 200
    assert (await client.get(f"/api/v1/businesses/{biz_id}")).json()["verified"] is False

    assert (await ac.delete(f"/api/v1/businesses/{biz_id}")).status_code in (200, 204)
    assert (await client.get(f"/api/v1/businesses/{biz_id}")).status_code == 404


# â”€â”€ Auth: token refresh, dev-login guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@pytest.mark.asyncio
async def test_refresh_token_issues_working_access_token(client, user_and_token):
    from app.core.security import create_refresh_token
    user, _token = user_and_token
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": create_refresh_token(str(user.id))})
    assert resp.status_code == 200, resp.text
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {resp.json()['access_token']}"})
    assert me.status_code == 200
    assert (await client.post("/api/v1/auth/refresh", json={"refresh_token": "garbage"})).status_code == 401


@pytest.mark.asyncio
async def test_dev_login_disabled_without_otp_debug(client, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "OTP_DEBUG", False)
    assert (await client.post("/api/v1/auth/dev-login")).status_code == 403


# â”€â”€ Seller public profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@pytest.mark.asyncio
async def test_public_profile_shows_active_listings(client, auth_client, admin_client, city, category):
    ac, user = auth_client
    admin_ac, _admin = admin_client
    listing_id = await _active_listing(ac, admin_ac, city, category, "Profile audit listing")
    resp = await client.get(f"/api/v1/users/{user.id}/public-profile")
    assert resp.status_code == 200, resp.text
    assert listing_id in [l["id"] for l in resp.json()["listings"]]
    assert (await client.get(f"/api/v1/users/{uuid.uuid4()}/public-profile")).status_code == 404
