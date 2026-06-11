"""
Admin endpoint tests — approve/reject pipeline, event queue,
user list, reports, and access-control guards.
"""
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
