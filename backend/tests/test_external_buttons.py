"""
Buttons that talk to outside services — Razorpay, Cloudinary — tested with
fakes so nothing reaches the real service (button audit 2026-10-25).
"""
import hashlib
import hmac
import uuid
from types import SimpleNamespace

import pytest
from unittest.mock import patch
from sqlalchemy import select

from tests.test_tickets import _create_ticketed_event


class _FakeResp:
    def __init__(self, data, status_code=200):
        self._data, self.status_code, self.text = data, status_code, str(data)

    def json(self):
        return self._data


def _fake_httpx(post=None, get=None, calls=None):
    """Stand-in for the `httpx` module inside a router: AsyncClient returns canned responses."""
    class _Client:
        def __init__(self, *a, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def post(self, url, **kw):
            if calls is not None:
                calls.append(("POST", url, kw))
            return post

        async def get(self, url, **kw):
            if calls is not None:
                calls.append(("GET", url, kw))
            return get
    return SimpleNamespace(AsyncClient=_Client)


def _razorpay_keys():
    from app.core.config import settings
    return patch.multiple(settings, RAZORPAY_KEY_ID="rzp_test_key", RAZORPAY_KEY_SECRET="test_secret")


def _sign(order_id, payment_id, secret="test_secret"):
    return hmac.new(secret.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()


async def _active_listing(ac, admin_ac, city, category):
    resp = await ac.post("/api/v1/listings", json={
        "title": "External audit listing",
        "description": "Created by the external-button tests",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    assert resp.status_code == 201, resp.text
    listing_id = resp.json()["id"]
    assert (await admin_ac.patch(f"/api/v1/admin/listings/{listing_id}/approve")).status_code == 200
    return listing_id


# ── Razorpay: "Promote listing" ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_featured_create_order_records_order(auth_client, admin_client, city, category, db):
    from app.models.payment_order import PaymentOrder
    ac, user = auth_client
    admin_ac, _ = admin_client
    listing_id = await _active_listing(ac, admin_ac, city, category)
    calls = []
    fake = _fake_httpx(post=_FakeResp({"id": "order_feat_1"}), calls=calls)

    with _razorpay_keys(), patch("app.routers.payments.httpx", fake):
        bad_plan = await ac.post("/api/v1/payments/featured/create-order", json={"listing_id": listing_id, "plan": "year"})
        resp = await ac.post("/api/v1/payments/featured/create-order", json={"listing_id": listing_id, "plan": "week"})

    assert bad_plan.status_code == 400
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["order_id"] == "order_feat_1" and body["amount"] == 9900 and body["key_id"] == "rzp_test_key"
    assert calls[0][2]["json"]["amount"] == 9900  # Razorpay was asked for the right price
    order = (await db.execute(select(PaymentOrder).where(PaymentOrder.razorpay_order_id == "order_feat_1"))).scalar_one()
    assert order.user_id == user.id and str(order.target_id) == listing_id and order.kind == "featured_listing"


@pytest.mark.asyncio
async def test_featured_create_order_guards(auth_client, admin_client, city, category):
    ac, _ = auth_client
    admin_ac, _ = admin_client
    listing_id = await _active_listing(ac, admin_ac, city, category)
    fake = _fake_httpx(post=_FakeResp({"error": "bad"}, status_code=500))
    from app.core.config import settings

    with patch.multiple(settings, RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET=""):
        not_configured = await ac.post("/api/v1/payments/featured/create-order", json={"listing_id": listing_id, "plan": "week"})
    with _razorpay_keys(), patch("app.routers.payments.httpx", fake):
        gateway_down = await ac.post("/api/v1/payments/featured/create-order", json={"listing_id": listing_id, "plan": "week"})
        unknown = await ac.post("/api/v1/payments/featured/create-order", json={"listing_id": str(uuid.uuid4()), "plan": "week"})

    assert not_configured.status_code == 503
    assert gateway_down.status_code == 502
    assert unknown.status_code == 404


# ── Razorpay: "Get verified badge" ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_business_badge_order_and_verify(auth_client, client, city, db):
    from app.models.business import Business
    ac, user = auth_client
    created = await ac.post("/api/v1/businesses", json={"name": "Badge Audit Biz", "city_id": str(city.id)})
    assert created.status_code == 201, created.text
    biz_id = created.json()["id"]
    biz = (await db.execute(select(Business).where(Business.id == uuid.UUID(biz_id)))).scalar_one()
    biz.owner_id = user.id
    await db.commit()

    fake = _fake_httpx(post=_FakeResp({"id": "order_badge_1"}))
    with _razorpay_keys(), patch("app.routers.payments.httpx", fake):
        order = await ac.post("/api/v1/payments/business-badge/create-order", json={"business_id": biz_id, "plan": "monthly"})
        assert order.status_code == 200, order.text
        assert order.json()["amount"] == 49900

        verify_body = {
            "razorpay_order_id": "order_badge_1", "razorpay_payment_id": "pay_badge_1",
            "business_id": biz_id, "plan": "monthly",
        }
        forged = await ac.post("/api/v1/payments/business-badge/verify", json={**verify_body, "razorpay_signature": "forged"})
        ok = await ac.post("/api/v1/payments/business-badge/verify",
                           json={**verify_body, "razorpay_signature": _sign("order_badge_1", "pay_badge_1")})
        replay = await ac.post("/api/v1/payments/business-badge/verify",
                               json={**verify_body, "razorpay_signature": _sign("order_badge_1", "pay_badge_1")})

    assert forged.status_code == 400
    assert ok.status_code == 200, ok.text
    assert replay.status_code == 400  # one payment can't be applied twice
    assert (await client.get(f"/api/v1/businesses/{biz_id}")).json()["verified"] is True


@pytest.mark.asyncio
async def test_business_badge_order_requires_owner(auth_client, city, db):
    from app.models.business import Business
    ac, _ = auth_client
    created = await ac.post("/api/v1/businesses", json={"name": "Not My Biz", "city_id": str(city.id)})
    biz_id = created.json()["id"]
    biz = (await db.execute(select(Business).where(Business.id == uuid.UUID(biz_id)))).scalar_one()
    biz.owner_id = None  # unclaimed — the creator becomes owner by default
    await db.commit()
    with _razorpay_keys(), patch("app.routers.payments.httpx", _fake_httpx(post=_FakeResp({"id": "x"}))):
        resp = await ac.post("/api/v1/payments/business-badge/create-order", json={"business_id": biz_id, "plan": "monthly"})
    assert resp.status_code == 403


# ── Razorpay: "Buy ticket" ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ticket_create_order_charges_event_price(auth_client, city, db):
    from app.models.payment_order import PaymentOrder
    ac, user = auth_client
    event = await _create_ticketed_event(auth_client, city, ticket_price=299.0)
    calls = []
    fake = _fake_httpx(post=_FakeResp({"id": "order_ticket_1"}), calls=calls)

    with _razorpay_keys(), patch("app.routers.tickets.httpx", fake):
        resp = await ac.post("/api/v1/tickets/create-order", json={"event_id": event["id"]})

    assert resp.status_code == 200, resp.text
    assert calls[0][2]["json"]["amount"] == 29900
    order = (await db.execute(select(PaymentOrder).where(PaymentOrder.razorpay_order_id == "order_ticket_1"))).scalar_one()
    assert order.user_id == user.id and str(order.target_id) == event["id"] and order.kind == "event_ticket"


@pytest.mark.asyncio
async def test_ticket_create_order_refuses_unapproved_event(auth_client, city):
    ac, _ = auth_client
    event = await _create_ticketed_event(auth_client, city, approve=False)
    with _razorpay_keys(), patch("app.routers.tickets.httpx", _fake_httpx(post=_FakeResp({"id": "x"}))):
        resp = await ac.post("/api/v1/tickets/create-order", json={"event_id": event["id"]})
    assert resp.status_code in (400, 404)


# ── Cloudinary: listing photo upload / delete ─────────────────────────────────

JPEG = b"\xff\xd8\xff\xe0" + b"0" * 100


@pytest.mark.asyncio
async def test_listing_photo_upload_and_delete(auth_client, admin_client, client, city, category, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "CLOUDINARY_CLOUD_NAME", "")  # mock mode — never hit real Cloudinary
    ac, _ = auth_client
    admin_ac, _ = admin_client
    listing_id = await _active_listing(ac, admin_ac, city, category)

    bad_type = await ac.post(f"/api/v1/upload/image/{listing_id}", files={"file": ("a.gif", b"GIF89a", "image/gif")})
    too_big = await ac.post(f"/api/v1/upload/image/{listing_id}",
                            files={"file": ("big.jpg", b"0" * (5 * 1024 * 1024 + 1), "image/jpeg")})
    assert bad_type.status_code == 400 and too_big.status_code == 400

    up = await ac.post(f"/api/v1/upload/image/{listing_id}", files={"file": ("a.jpg", JPEG, "image/jpeg")})
    assert up.status_code == 201, up.text
    image_id = up.json()["id"]
    images = (await client.get(f"/api/v1/listings/{listing_id}")).json()["images"]
    assert image_id in [i["id"] for i in images]

    assert (await ac.delete(f"/api/v1/upload/image/{image_id}")).status_code == 204
    images = (await client.get(f"/api/v1/listings/{listing_id}")).json()["images"]
    assert image_id not in [i["id"] for i in images]


@pytest.mark.asyncio
async def test_listing_photo_limit_and_owner_only(auth_client, admin_client, city, category, monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "CLOUDINARY_CLOUD_NAME", "")
    ac, _ = auth_client
    admin_ac, admin = admin_client
    listing_id = await _active_listing(ac, admin_ac, city, category)
    for _ in range(5):
        assert (await ac.post(f"/api/v1/upload/image/{listing_id}", files={"file": ("a.jpg", JPEG, "image/jpeg")})).status_code == 201
    sixth = await ac.post(f"/api/v1/upload/image/{listing_id}", files={"file": ("a.jpg", JPEG, "image/jpeg")})
    assert sixth.status_code == 400  # max 5 photos (BL-08)


# ── Admin "Seed Images" ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_seed_placeholder_images_fills_photo_less_listings(auth_client, admin_client, city, category, db):
    from app.models.listing_image import ListingImage
    ac, _ = auth_client
    admin_ac, _ = admin_client
    listing_id = await _active_listing(ac, admin_ac, city, category)

    assert (await ac.post("/api/v1/admin/seed-placeholder-images")).status_code == 403
    resp = await admin_ac.post("/api/v1/admin/seed-placeholder-images")
    assert resp.status_code == 200, resp.text
    imgs = (await db.execute(select(ListingImage).where(ListingImage.listing_id == uuid.UUID(listing_id)))).scalars().all()
    assert len(imgs) == 1 and "placehold.co" in imgs[0].url

    # Second run doesn't add a duplicate
    await admin_ac.post("/api/v1/admin/seed-placeholder-images")
    db.expire_all()
    imgs = (await db.execute(select(ListingImage).where(ListingImage.listing_id == uuid.UUID(listing_id)))).scalars().all()
    assert len(imgs) == 1
