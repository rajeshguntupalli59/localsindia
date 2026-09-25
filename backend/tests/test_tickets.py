import hashlib
import hmac
import uuid

import pytest
from unittest.mock import patch
from sqlalchemy import update
from sqlalchemy.ext.asyncio import async_sessionmaker

from tests.conftest import _make_engine


def _sign(order_id: str, payment_id: str, secret: str) -> str:
    return hmac.new(
        key=secret.encode(),
        msg=f"{order_id}|{payment_id}".encode(),
        digestmod=hashlib.sha256,
    ).hexdigest()


async def _run(fn):
    engine = _make_engine()
    async with async_sessionmaker(engine, expire_on_commit=False)() as s:
        result = await fn(s)
        await s.commit()
    await engine.dispose()
    return result


async def _set_event_status(event_id, status):
    from app.models.event import Event
    await _run(lambda s: s.execute(update(Event).where(Event.id == uuid.UUID(event_id)).values(status=status)))


async def _create_ticketed_event(auth_client, city, ticket_price=299.0, approve=True):
    ac, _user = auth_client
    res = await ac.post(
        "/api/v1/events",
        json={
            "title": "Test Concert",
            "description": "A great show",
            "venue": "City Grounds",
            "event_date": "2026-12-01T18:00:00Z",
            "city_id": str(city.id),
            "is_free": False,
            "ticket_price": ticket_price,
        },
    )
    assert res.status_code == 201, res.text
    event = res.json()
    if approve:
        await _set_event_status(event["id"], "active")
    return event


async def _order(user_id, event_id, amount=29900):
    """The server-side record /tickets/create-order writes after Razorpay creates the order."""
    from app.models.payment_order import PaymentOrder
    order_id = f"order_{uuid.uuid4().hex[:12]}"
    await _run(lambda s: s.add(PaymentOrder(
        razorpay_order_id=order_id, user_id=user_id, kind="event_ticket",
        target_id=uuid.UUID(event_id), plan="ticket", amount=amount,
    )) or s.flush())
    return order_id


async def _verify(ac, event_id, order_id, payment_id=None, secret="test_secret"):
    from app.core.config import settings
    payment_id = payment_id or f"pay_{uuid.uuid4().hex[:12]}"
    with patch.object(settings, "RAZORPAY_KEY_SECRET", secret):
        return await ac.post(
            "/api/v1/tickets/verify",
            json={
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": _sign(order_id, payment_id, secret),
                "event_id": event_id,
            },
        )


async def _buy(auth_client, event_id):
    ac, user = auth_client
    return await _verify(ac, event_id, await _order(user.id, event_id))


@pytest.mark.asyncio
async def test_verify_ticket_creates_ticket_with_qr_token(auth_client, city):
    event = await _create_ticketed_event(auth_client, city)

    resp = await _buy(auth_client, event["id"])
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["event_id"] == event["id"]
    assert data["amount"] == 29900
    assert data["qr_token"]
    assert data["qr_image"].startswith("data:image/png;base64,")
    assert data["used_at"] is None
    assert data["event_title"] == "Test Concert"


@pytest.mark.asyncio
async def test_verify_ticket_rejects_bad_signature(auth_client, city):
    ac, user = auth_client
    event = await _create_ticketed_event(auth_client, city)
    order_id = await _order(user.id, event["id"])

    resp = await ac.post(
        "/api/v1/tickets/verify",
        json={
            "razorpay_order_id": order_id,
            "razorpay_payment_id": "pay_x",
            "razorpay_signature": "forged",
            "event_id": event["id"],
        },
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_one_payment_cannot_be_replayed(auth_client, city):
    ac, user = auth_client
    event = await _create_ticketed_event(auth_client, city)
    order_id = await _order(user.id, event["id"])
    assert (await _verify(ac, event["id"], order_id, payment_id="pay_once")).status_code == 200
    again = await _verify(ac, event["id"], order_id, payment_id="pay_once")
    assert again.status_code == 400


@pytest.mark.asyncio
async def test_payment_for_cheap_event_cannot_buy_another_event(auth_client, city):
    ac, user = auth_client
    cheap = await _create_ticketed_event(auth_client, city, ticket_price=1)
    pricey = await _create_ticketed_event(auth_client, city, ticket_price=5000)
    order_id = await _order(user.id, cheap["id"], amount=100)

    resp = await _verify(ac, pricey["id"], order_id)
    assert resp.status_code == 400
    my = (await ac.get("/api/v1/tickets/my")).json()
    assert all(t["event_id"] != pricey["id"] for t in my)


@pytest.mark.asyncio
async def test_someone_elses_order_is_rejected(client, auth_client, db, city):
    from app.models.user import User
    from app.core.security import create_access_token
    event = await _create_ticketed_event(auth_client, city)
    _ac, owner = auth_client
    order_id = await _order(owner.id, event["id"])

    other = User(phone=f"+9190{uuid.uuid4().int % 10**9:09d}", name="Someone Else")
    db.add(other)
    await db.commit()
    await db.refresh(other)
    client.headers["Authorization"] = f"Bearer {create_access_token(str(other.id))}"
    assert (await _verify(client, event["id"], order_id)).status_code == 403


@pytest.mark.asyncio
async def test_unknown_order_is_rejected(auth_client, city):
    ac, _user = auth_client
    event = await _create_ticketed_event(auth_client, city)
    assert (await _verify(ac, event["id"], "order_never_created")).status_code == 404


@pytest.mark.asyncio
async def test_unapproved_event_does_not_sell_tickets(auth_client, city):
    event = await _create_ticketed_event(auth_client, city, approve=False)
    assert (await _buy(auth_client, event["id"])).status_code == 404


@pytest.mark.asyncio
async def test_verify_ticket_rejects_free_event(auth_client, city):
    ac, _user = auth_client
    res = await ac.post(
        "/api/v1/events",
        json={
            "title": "Free Meetup",
            "description": "No cost",
            "venue": "Community Hall",
            "event_date": "2026-12-01T18:00:00Z",
            "city_id": str(city.id),
            "is_free": True,
        },
    )
    free_event = res.json()
    await _set_event_status(free_event["id"], "active")

    resp = await _buy(auth_client, free_event["id"])
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_owner_cannot_approve_own_event(auth_client, city):
    ac, _user = auth_client
    event = await _create_ticketed_event(auth_client, city, approve=False)
    resp = await ac.patch(f"/api/v1/events/{event['id']}", json={"status": "active", "title": "Test Concert 2"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending"
    assert resp.json()["title"] == "Test Concert 2"


@pytest.mark.asyncio
async def test_get_ticket_requires_owner(client, auth_client, db, city):
    event = await _create_ticketed_event(auth_client, city)
    ticket = (await _buy(auth_client, event["id"])).json()

    from app.models.user import User
    from app.core.security import create_access_token

    other = User(phone=f"+9190{uuid.uuid4().int % 10**9:09d}", name="Someone Else")
    db.add(other)
    await db.commit()
    await db.refresh(other)
    other_token = create_access_token(str(other.id))

    resp = await client.get(
        f"/api/v1/tickets/{ticket['id']}",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_my_tickets(auth_client, city):
    ac, _user = auth_client
    event = await _create_ticketed_event(auth_client, city)
    await _buy(auth_client, event["id"])
    await _buy(auth_client, event["id"])

    resp = await ac.get("/api/v1/tickets/my")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


@pytest.mark.asyncio
async def test_admin_scan_marks_ticket_used(auth_client, admin_client, city):
    event = await _create_ticketed_event(auth_client, city)
    ticket = (await _buy(auth_client, event["id"])).json()

    admin_ac, _admin = admin_client
    resp = await admin_ac.post("/api/v1/admin/tickets/scan", json={"qr_token": ticket["qr_token"]})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "valid"
    assert data["event_title"] == "Test Concert"


@pytest.mark.asyncio
async def test_admin_scan_rejects_reused_ticket(auth_client, admin_client, city):
    event = await _create_ticketed_event(auth_client, city)
    ticket = (await _buy(auth_client, event["id"])).json()

    admin_ac, _admin = admin_client
    first = await admin_ac.post("/api/v1/admin/tickets/scan", json={"qr_token": ticket["qr_token"]})
    assert first.status_code == 200

    second = await admin_ac.post("/api/v1/admin/tickets/scan", json={"qr_token": ticket["qr_token"]})
    assert second.status_code == 409


@pytest.mark.asyncio
async def test_admin_scan_rejects_unknown_token(admin_client):
    admin_ac, _admin = admin_client
    resp = await admin_ac.post("/api/v1/admin/tickets/scan", json={"qr_token": "not-a-real-token"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_admin_scan_requires_admin_role(auth_client, city):
    ac, _user = auth_client
    event = await _create_ticketed_event(auth_client, city)
    ticket = (await _buy(auth_client, event["id"])).json()

    resp = await ac.post("/api/v1/admin/tickets/scan", json={"qr_token": ticket["qr_token"]})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_public_listing_feed_hides_unpublished(client, city):
    for status in ("pending", "flagged", "rejected"):
        resp = await client.get(f"/api/v1/cities/{city.slug}/listings?status={status}")
        assert resp.status_code == 422, status
    assert (await client.get(f"/api/v1/cities/{city.slug}/listings?status=active")).status_code == 200


@pytest.mark.asyncio
async def test_links_must_be_web_addresses(auth_client, city):
    ac, _user = auth_client
    bad = await ac.post("/api/v1/businesses", json={
        "name": "Link Test Shop", "city_id": str(city.id), "website_url": "javascript:alert(1)"})
    assert bad.status_code == 422
    ok = await ac.post("/api/v1/businesses", json={
        "name": "Link Test Shop", "city_id": str(city.id), "website_url": "https://example.com"})
    assert ok.status_code == 201
    event = await ac.post("/api/v1/events", json={
        "title": "Link Test", "description": "x", "venue": "Hall 1", "event_date": "2026-12-01T18:00:00Z",
        "city_id": str(city.id), "is_free": True, "ticket_url": "javascript:alert(1)"})
    assert event.status_code == 422
