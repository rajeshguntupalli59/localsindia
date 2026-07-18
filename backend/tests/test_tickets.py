import hashlib
import hmac
import pytest
from unittest.mock import patch


def _sign(order_id: str, payment_id: str, secret: str) -> str:
    return hmac.new(
        key=secret.encode(),
        msg=f"{order_id}|{payment_id}".encode(),
        digestmod=hashlib.sha256,
    ).hexdigest()


async def _create_ticketed_event(auth_client, city, ticket_price=299.0):
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
    return res.json()


async def _verify_ticket(ac, event_id, secret="test_secret", order_id="order_t1", payment_id="pay_t1"):
    from app.core.config import settings
    with patch.object(settings, "RAZORPAY_KEY_SECRET", secret):
        signature = _sign(order_id, payment_id, secret)
        return await ac.post(
            "/api/v1/tickets/verify",
            json={
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
                "event_id": event_id,
            },
        )


@pytest.mark.asyncio
async def test_verify_ticket_creates_ticket_with_qr_token(auth_client, city):
    ac, _user = auth_client
    event = await _create_ticketed_event(auth_client, city)

    resp = await _verify_ticket(ac, event["id"])
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
    ac, _user = auth_client
    event = await _create_ticketed_event(auth_client, city)

    resp = await ac.post(
        "/api/v1/tickets/verify",
        json={
            "razorpay_order_id": "order_x",
            "razorpay_payment_id": "pay_x",
            "razorpay_signature": "forged",
            "event_id": event["id"],
        },
    )
    assert resp.status_code == 400


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

    resp = await _verify_ticket(ac, free_event["id"])
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_get_ticket_requires_owner(client, auth_client, db, city):
    ac, _user = auth_client
    event = await _create_ticketed_event(auth_client, city)
    ticket = (await _verify_ticket(ac, event["id"])).json()

    import uuid
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
    await _verify_ticket(ac, event["id"], order_id="order_a", payment_id="pay_a")
    await _verify_ticket(ac, event["id"], order_id="order_b", payment_id="pay_b")

    resp = await ac.get("/api/v1/tickets/my")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


@pytest.mark.asyncio
async def test_admin_scan_marks_ticket_used(auth_client, admin_client, city):
    ac, _user = auth_client
    event = await _create_ticketed_event(auth_client, city)
    ticket = (await _verify_ticket(ac, event["id"])).json()

    admin_ac, _admin = admin_client
    resp = await admin_ac.post("/api/v1/admin/tickets/scan", json={"qr_token": ticket["qr_token"]})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "valid"
    assert data["event_title"] == "Test Concert"


@pytest.mark.asyncio
async def test_admin_scan_rejects_reused_ticket(auth_client, admin_client, city):
    ac, _user = auth_client
    event = await _create_ticketed_event(auth_client, city)
    ticket = (await _verify_ticket(ac, event["id"])).json()

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
    ticket = (await _verify_ticket(ac, event["id"])).json()

    resp = await ac.post("/api/v1/admin/tickets/scan", json={"qr_token": ticket["qr_token"]})
    assert resp.status_code == 403
