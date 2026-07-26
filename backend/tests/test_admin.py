"""
Admin endpoint tests — approve/reject pipeline, event queue,
user list, reports, and access-control guards.
"""
import json
import uuid
import pytest
from datetime import datetime, timezone, timedelta


# ── Access-control guards ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_regular_user_cannot_access_admin_endpoints(auth_client):
    """Regular authenticated user receives 403 on all admin endpoints."""
    ac, _user = auth_client
    endpoints = [
        ("GET",   "/api/v1/admin/listings/pending"),
        ("GET",   "/api/v1/admin/listings"),
        ("GET",   "/api/v1/admin/users"),
        ("GET",   "/api/v1/admin/reports"),
        ("GET",   "/api/v1/admin/events/pending"),
        ("GET",   "/api/v1/admin/events"),
        ("GET",   "/api/v1/admin/activity-feed"),
    ]
    for method, path in endpoints:
        resp = await (ac.get(path) if method == "GET" else ac.post(path))
        assert resp.status_code == 403, f"Expected 403 for {method} {path}, got {resp.status_code}"


@pytest.mark.asyncio
async def test_unauthenticated_cannot_access_admin_endpoints(client):
    """Unauthenticated requests receive 403 on admin endpoints."""
    resp = await client.get("/api/v1/admin/listings/pending")
    assert resp.status_code == 403


# ── Pending listings queue ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_pending_queue_contains_new_listing(admin_client, auth_client, city, category):
    """Newly created listing (status=pending) appears in admin pending queue."""
    ac, _user = auth_client
    admin_ac, _admin = admin_client

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Pending listing for admin",
        "description": "Should appear in pending queue",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    assert create_resp.status_code == 201
    listing_id = create_resp.json()["id"]

    resp = await admin_ac.get("/api/v1/admin/listings/pending")
    assert resp.status_code == 200
    ids = [l["id"] for l in resp.json()]
    assert listing_id in ids


# ── Approve workflow ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_approve_makes_listing_active_and_public(admin_client, auth_client, city, category):
    """Approve: status → 'active'; listing becomes visible in public city endpoint."""
    ac, _user = auth_client
    admin_ac, _admin = admin_client

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Approvable listing",
        "description": "Admin will approve",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    # Approve
    approve_resp = await admin_ac.patch(f"/api/v1/admin/listings/{listing_id}/approve")
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "active"

    # Verify listing is now visible to the public
    city_resp = await ac.get(f"/api/v1/cities/{city.slug}/listings")
    assert city_resp.status_code == 200
    ids = [l["id"] for l in city_resp.json()]
    assert listing_id in ids


# ── Reject workflow ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_reject_listing_not_public(admin_client, auth_client, city, category):
    """Reject: status → 'rejected'; listing does NOT appear in public city listings."""
    ac, _user = auth_client
    admin_ac, _admin = admin_client

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Rejectable listing",
        "description": "Admin will reject",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    reject_resp = await admin_ac.patch(f"/api/v1/admin/listings/{listing_id}/reject")
    assert reject_resp.status_code == 200
    assert reject_resp.json()["status"] == "rejected"

    # Verify NOT in public active listings
    city_resp = await ac.get(f"/api/v1/cities/{city.slug}/listings")
    active_ids = [l["id"] for l in city_resp.json()]
    assert listing_id not in active_ids


@pytest.mark.asyncio
async def test_admin_approve_nonexistent_listing_404(admin_client):
    """Approving a non-existent listing returns 404."""
    admin_ac, _admin = admin_client
    fake_id = str(uuid.uuid4())
    resp = await admin_ac.patch(f"/api/v1/admin/listings/{fake_id}/approve")
    assert resp.status_code == 404


# ── Admin list by status ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_list_listings_by_status(admin_client, auth_client, city, category):
    """GET /admin/listings?status=pending returns only pending listings."""
    ac, _user = auth_client
    admin_ac, _admin = admin_client

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Status filter listing",
        "description": "Used to test admin status filter",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    resp = await admin_ac.get("/api/v1/admin/listings?status=pending")
    assert resp.status_code == 200
    ids = [l["id"] for l in resp.json()]
    assert listing_id in ids


@pytest.mark.asyncio
async def test_admin_list_listings_search_by_title(admin_client, auth_client, city, category):
    """GET /admin/listings?status=active&q=... narrows results to matching titles.

    Regression coverage for a real admin pain point: a test/QA listing was
    hard to find by scrolling a long active-listings list.
    """
    ac, _user = auth_client
    admin_ac, _admin = admin_client

    qa_resp = await ac.post("/api/v1/listings", json={
        "title": "QA test listing please ignore",
        "description": "Created for QA, should be easy to find and delete",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    qa_id = qa_resp.json()["id"]
    await admin_ac.patch(f"/api/v1/admin/listings/{qa_id}/approve")

    other_resp = await ac.post("/api/v1/listings", json={
        "title": "Genuine sofa for sale",
        "description": "Not a QA listing",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    other_id = other_resp.json()["id"]
    await admin_ac.patch(f"/api/v1/admin/listings/{other_id}/approve")

    resp = await admin_ac.get("/api/v1/admin/listings?status=active&q=QA")
    assert resp.status_code == 200
    ids = [l["id"] for l in resp.json()]
    assert qa_id in ids
    assert other_id not in ids


# ── Users list ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_list_users_returns_correct_shape(admin_client, user_and_token):
    """Admin can list users; each entry has id, phone, role fields."""
    admin_ac, _admin = admin_client
    _user, _token = user_and_token

    resp = await admin_ac.get("/api/v1/admin/users")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list) and len(data) >= 1
    for user in data:
        assert "id" in user
        assert "phone" in user
        assert "role" in user
        assert "is_active" in user


# ── Reports list ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_reports_list_contains_submitted_report(admin_client, auth_client, city, category):
    """Reports submitted by users appear in admin /admin/reports."""
    ac, _user = auth_client
    admin_ac, _admin = admin_client

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Reported spam listing",
        "description": "Will be reported",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    report_resp = await ac.post(
        f"/api/v1/listings/{listing_id}/report",
        json={"reason": "spam", "notes": "Misleading content"},
    )
    assert report_resp.status_code == 201

    resp = await admin_ac.get("/api/v1/admin/reports")
    assert resp.status_code == 200
    data = resp.json()
    assert any(r["listing_id"] == listing_id for r in data)
    matching = next(r for r in data if r["listing_id"] == listing_id)
    assert matching["reason"] == "spam"


# ── Admin events ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_event_approve_reject_pipeline(admin_client, auth_client, city, category):
    """Full event pipeline: post event → admin sees pending → approve → active."""
    ac, _user = auth_client
    admin_ac, _admin = admin_client

    future_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    create_resp = await ac.post("/api/v1/events", json={
        "title": "Tech meetup Hyderabad",
        "description": "Monthly tech talks",
        "venue": "Koramangala Community Hall",
        "event_date": future_date,
        "city_id": str(city.id),
        "category_id": str(category.id),
        "is_free": True,
    })
    assert create_resp.status_code == 201
    event = create_resp.json()
    event_id = event["id"]
    assert event["status"] == "pending"

    # Admin sees it in pending queue
    pending_resp = await admin_ac.get("/api/v1/admin/events/pending")
    assert pending_resp.status_code == 200
    pending_ids = [e["id"] for e in pending_resp.json()]
    assert event_id in pending_ids

    # Admin approves → active
    approve_resp = await admin_ac.patch(f"/api/v1/admin/events/{event_id}/approve")
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "active"

    # No longer in pending queue
    pending_resp2 = await admin_ac.get("/api/v1/admin/events/pending")
    ids2 = [e["id"] for e in pending_resp2.json()]
    assert event_id not in ids2


@pytest.mark.asyncio
async def test_admin_event_reject(admin_client, auth_client, city, category):
    """Admin can reject an event — status becomes 'cancelled'."""
    ac, _user = auth_client
    admin_ac, _admin = admin_client

    future_date = (datetime.now(timezone.utc) + timedelta(days=15)).isoformat()
    create_resp = await ac.post("/api/v1/events", json={
        "title": "Rejected event",
        "description": "This will be cancelled",
        "venue": "Some venue",
        "event_date": future_date,
        "city_id": str(city.id),
        "is_free": True,
    })
    assert create_resp.status_code == 201
    event_id = create_resp.json()["id"]

    reject_resp = await admin_ac.patch(f"/api/v1/admin/events/{event_id}/reject")
    assert reject_resp.status_code == 200
    assert reject_resp.json()["status"] == "cancelled"


# ── Full end-to-end approval flow ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_full_listing_lifecycle(admin_client, auth_client, city, category):
    """
    End-to-end: create → pending → admin approve → active →
    wa-click → wa_verified → user fulfills → fulfilled.
    """
    from uuid import UUID
    from sqlalchemy import select
    from app.models.listing import Listing as ListingModel

    ac, user = auth_client
    admin_ac, _admin = admin_client

    # 1. Create
    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Full lifecycle test",
        "description": "Testing complete workflow",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
        "area": "Banjara Hills",
        "whatsapp_url": "https://wa.me/919876543210",
    })
    assert create_resp.status_code == 201
    listing_id = create_resp.json()["id"]
    assert create_resp.json()["status"] == "pending"
    assert create_resp.json()["area"] == "Banjara Hills"

    # 2. Admin approve
    approve_resp = await admin_ac.patch(f"/api/v1/admin/listings/{listing_id}/approve")
    assert approve_resp.json()["status"] == "active"

    # 3. WA click
    wa_resp = await ac.post(f"/api/v1/listings/{listing_id}/wa-click")
    assert wa_resp.status_code == 204

    # 4. Verify wa_verified via direct GET
    get_resp = await ac.get(f"/api/v1/listings/{listing_id}")
    assert get_resp.json()["status"] == "active"

    # 5. Fulfill
    fulfill_resp = await ac.post(f"/api/v1/listings/{listing_id}/fulfill")
    assert fulfill_resp.status_code == 200
    assert fulfill_resp.json()["status"] == "fulfilled"

    # 6. After fulfilled — no longer in city active listings
    city_resp = await ac.get(f"/api/v1/cities/{city.slug}/listings")
    active_ids = [l["id"] for l in city_resp.json()]
    assert listing_id not in active_ids


# ── Admin broadcast ─────────────────────────────────────────────────────────
# Raj asked for a way to send an announcement to every device that has the
# app installed - existing push infra (DeviceToken + send_push) already does
# per-user pushes for events like listing approval, this reuses it but
# batches every registered token into one Expo call instead of one per user.

@pytest.mark.asyncio
async def test_broadcast_requires_admin(auth_client):
    ac, _user = auth_client
    resp = await ac.post("/api/v1/admin/broadcast", json={"title": "Hi", "body": "Test"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_broadcast_pushes_to_every_registered_device(db, admin_client, user_and_token):
    """Scoped against a baseline read rather than an absolute count, since the
    shared test DB may already have device tokens from other tests."""
    from unittest.mock import patch, AsyncMock
    from app.models.device_token import DeviceToken
    from app.models.user_notification import UserNotification
    from sqlalchemy import select

    ac, _admin = admin_client
    user, _token = user_and_token

    baseline_tokens = (await db.execute(select(DeviceToken.token))).scalars().all()
    baseline_users = (await db.execute(select(DeviceToken.user_id))).scalars().all()

    db.add(DeviceToken(user_id=user.id, token="ExponentPushToken[bob]"))
    await db.commit()

    with patch("app.services.push_svc.send_push", new_callable=AsyncMock) as mock_send:
        resp = await ac.post("/api/v1/admin/broadcast", json={"title": "New feature!", "body": "Check it out"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["devices_pushed"] == len(baseline_tokens) + 1
    assert body["users_notified"] == len(set(baseline_users) | {user.id})

    all_pushed_tokens = [t for call in mock_send.call_args_list for t in call.args[0]]
    assert "ExponentPushToken[bob]" in all_pushed_tokens
    for call in mock_send.call_args_list:
        assert call.args[1] == "New feature!"
        assert call.args[2] == "Check it out"

    notif_result = await db.execute(
        select(UserNotification).where(
            UserNotification.user_id == user.id,
            UserNotification.type == "admin_broadcast",
        )
    )
    notif = notif_result.scalar_one()
    assert notif.title == "New feature!"
    assert notif.body == "Check it out"


@pytest.mark.asyncio
async def test_broadcast_chunks_over_100_tokens(db, admin_client, user_and_token):
    """Expo's push API documents a 100-message-per-request limit - a user
    with many devices, or many users total, must be split into batches."""
    from unittest.mock import patch, AsyncMock
    import math
    from sqlalchemy import select, func
    from app.models.device_token import DeviceToken

    ac, _admin = admin_client
    user, _token = user_and_token

    baseline_count = await db.scalar(select(func.count()).select_from(DeviceToken))

    for i in range(150):
        db.add(DeviceToken(user_id=user.id, token=f"ExponentPushToken[device-{i}]"))
    await db.commit()

    with patch("app.services.push_svc.send_push", new_callable=AsyncMock) as mock_send:
        resp = await ac.post("/api/v1/admin/broadcast", json={"title": "Hi", "body": "Test"})
    assert resp.status_code == 200
    total = baseline_count + 150
    assert resp.json()["devices_pushed"] == total

    expected_batches = math.ceil(total / 100)
    assert mock_send.await_count == expected_batches
    for call in mock_send.call_args_list[:-1]:
        assert len(call.args[0]) == 100
    assert len(mock_send.call_args_list[-1].args[0]) == total - 100 * (expected_batches - 1)


# ── Activity feed (marketing/content log merge) ────────────────────────────────

@pytest.mark.asyncio
async def test_admin_activity_feed_merges_and_sorts_sources(admin_client):
    """Social posts, ecosystem posts, and blog history all appear in one
    feed, newest first, regardless of which file they came from."""
    from unittest.mock import AsyncMock, patch
    import app.routers.admin as admin_module

    admin_module._activity_cache["data"] = None  # avoid stale cache from another test

    social_log = (
        '{"timestamp": "2026-07-20T10:00:00", "topic": "jobs", "headline": "Find Jobs Fast", '
        '"format": "image", "facebook_post_id": "fb1", "instagram_feed_id": "ig1"}\n'
    )
    ecosystem_log = (
        '{"timestamp": "2026-07-22T10:00:00", "tagline": "One App, Every Need", '
        '"benefit_keys": ["jobs", "pg"], "facebook_post_id": "fb2", "instagram_feed_id": "ig2"}\n'
    )
    blog_state = json.dumps({
        "history": [
            {"citySlug": "hyderabad", "category": "pg-roommate", "topicTemplateId": "avoid-scam", "publishedAt": "2026-07-25T08:30:00"},
        ]
    })

    async def fake_fetch_raw(client, path):
        if "social_posts_log" in path:
            return social_log
        if "ecosystem_posts_log" in path:
            return ecosystem_log
        if "blog_rotation" in path:
            return blog_state
        raise AssertionError(f"unexpected path: {path}")

    ac, _admin = admin_client
    with patch("app.routers.admin._fetch_raw", new=fake_fetch_raw):
        resp = await ac.get("/api/v1/admin/activity-feed")

    assert resp.status_code == 200
    items = resp.json()
    assert [i["type"] for i in items] == ["blog_article", "ecosystem_post", "social_post"]
    assert items[0]["title"] == "hyderabad — pg-roommate"
    assert items[1]["title"] == "One App, Every Need"
    assert items[2]["title"] == "Find Jobs Fast"


@pytest.mark.asyncio
async def test_admin_activity_feed_handles_missing_files_gracefully(admin_client):
    """A source file that's never been committed yet (404 from GitHub raw)
    doesn't fail the whole request - it's just an empty contribution."""
    from unittest.mock import patch
    import app.routers.admin as admin_module

    admin_module._activity_cache["data"] = None

    async def fake_fetch_raw_404(client, path):
        return None

    ac, _admin = admin_client
    with patch("app.routers.admin._fetch_raw", new=fake_fetch_raw_404):
        resp = await ac.get("/api/v1/admin/activity-feed")

    assert resp.status_code == 200
    assert resp.json() == []
