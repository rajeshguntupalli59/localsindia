import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.routers import business_claims
from app.routers.business_claims import normalize_indian_mobile
from tests.conftest import _make_engine

FAKE_JPEG = b"\xff\xd8\xff\xe0" + b"0" * 100  # Cloudinary is mocked in tests


async def _unclaimed_business(city, phone="+91 98480 22338"):
    """Directory business with no owner, as an import would create it."""
    from app.models.business import Business
    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as s:
        b = Business(city_id=city.id, name=f"Sri Balaji Tiffins {uuid.uuid4().hex[:4]}", phone=phone)
        s.add(b)
        await s.commit()
        await s.refresh(b)
    await engine.dispose()
    return b


async def _owner_of(business_id):
    from app.models.business import Business
    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as s:
        owner = (await s.execute(select(Business.owner_id).where(Business.id == business_id))).scalar_one()
    await engine.dispose()
    return owner


def _doc_files(card=False):
    files = {
        "document": ("gst.jpg", FAKE_JPEG, "image/jpeg"),
        "shop_photo": ("shop.jpg", FAKE_JPEG, "image/jpeg"),
    }
    if card:
        files["visiting_card"] = ("card.jpg", FAKE_JPEG, "image/jpeg")
    return files


def test_normalize_indian_mobile():
    assert normalize_indian_mobile("+91 98480 22338") == "+919848022338"
    assert normalize_indian_mobile("098480-22338") == "+919848022338"
    assert normalize_indian_mobile("919848022338") == "+919848022338"
    assert normalize_indian_mobile("040 2345 6789") is None     # landline
    assert normalize_indian_mobile(None) is None


@pytest.mark.asyncio
async def test_old_instant_claim_endpoint_is_gone(auth_client, city):
    client, _ = auth_client
    b = await _unclaimed_business(city)
    res = await client.post(f"/api/v1/businesses/{b.id}/claim")
    assert res.status_code in (404, 405)
    assert await _owner_of(b.id) is None


@pytest.mark.asyncio
async def test_otp_claim_happy_path(auth_client, city, monkeypatch):
    client, user = auth_client
    monkeypatch.setattr(business_claims, "generate_otp", lambda: "482913")
    b = await _unclaimed_business(city)

    opts = (await client.get(f"/api/v1/businesses/{b.id}/claim-options")).json()
    assert opts["otp_available"] is True
    assert opts["masked_phone"] == "+91 ••••• 2338"

    send = await client.post(f"/api/v1/businesses/{b.id}/claim/otp/send")
    assert send.status_code == 200
    assert "otp" not in send.json()  # never leaked outside OTP_DEBUG

    ok = await client.post(f"/api/v1/businesses/{b.id}/claim/otp/verify", json={"otp": "482913"})
    assert ok.status_code == 200
    assert await _owner_of(b.id) == user.id


@pytest.mark.asyncio
async def test_otp_wrong_code_locks_after_three(auth_client, city, monkeypatch):
    client, _ = auth_client
    monkeypatch.setattr(business_claims, "generate_otp", lambda: "482913")
    b = await _unclaimed_business(city)
    await client.post(f"/api/v1/businesses/{b.id}/claim/otp/send")

    for _ in range(3):
        r = await client.post(f"/api/v1/businesses/{b.id}/claim/otp/verify", json={"otp": "000000"})
        assert r.status_code == 400
    # 4th attempt is refused even with the right code
    r = await client.post(f"/api/v1/businesses/{b.id}/claim/otp/verify", json={"otp": "482913"})
    assert r.status_code == 429
    assert await _owner_of(b.id) is None


@pytest.mark.asyncio
async def test_otp_not_offered_for_landline(auth_client, city):
    client, _ = auth_client
    b = await _unclaimed_business(city, phone="040 2345 6789")
    opts = (await client.get(f"/api/v1/businesses/{b.id}/claim-options")).json()
    assert opts["otp_available"] is False
    r = await client.post(f"/api/v1/businesses/{b.id}/claim/otp/send")
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_documents_claim_then_admin_approves(auth_client, admin_client, city):
    client, user = auth_client
    admin, _ = admin_client
    b = await _unclaimed_business(city, phone=None)

    r = await client.post(
        f"/api/v1/businesses/{b.id}/claim/documents",
        data={"doc_type": "fssai", "contact_phone": "9848022338", "note": "Owner since 2015"},
        files=_doc_files(card=True),
    )
    assert r.status_code == 201
    assert r.json()["status"] == "pending"
    assert await _owner_of(b.id) is None  # nothing changes until an admin approves

    dup = await client.post(
        f"/api/v1/businesses/{b.id}/claim/documents",
        data={"doc_type": "fssai", "contact_phone": "9848022338"}, files=_doc_files(),
    )
    assert dup.status_code == 409

    queue = (await admin.get("/api/v1/admin/business-claims")).json()
    mine = next(c for c in queue if c["business"]["id"] == str(b.id))
    assert mine["contact_phone"] == "+919848022338"
    assert mine["doc_label"].startswith("FSSAI")
    assert mine["document_url"] and mine["shop_photo_url"] and mine["visiting_card_url"]

    ok = await admin.post(f"/api/v1/admin/business-claims/{mine['id']}/approve")
    assert ok.status_code == 200
    assert await _owner_of(b.id) == user.id


@pytest.mark.asyncio
async def test_reject_needs_reason_and_non_admin_blocked(auth_client, admin_client, city):
    client, _ = auth_client
    admin, _ = admin_client
    b = await _unclaimed_business(city)
    await client.post(
        f"/api/v1/businesses/{b.id}/claim/documents",
        data={"doc_type": "electricity_bill", "contact_phone": "+919848022338"}, files=_doc_files(),
    )
    assert (await client.get("/api/v1/admin/business-claims")).status_code == 403

    queue = (await admin.get("/api/v1/admin/business-claims")).json()
    claim_id = next(c["id"] for c in queue if c["business"]["id"] == str(b.id))
    assert (await admin.post(f"/api/v1/admin/business-claims/{claim_id}/reject", json={"reason": " "})).status_code == 400
    r = await admin.post(f"/api/v1/admin/business-claims/{claim_id}/reject", json={"reason": "Bill name doesn't match"})
    assert r.status_code == 200
    assert await _owner_of(b.id) is None


@pytest.mark.asyncio
async def test_admin_approves_email_claim(auth_client, admin_client, city):
    from app.models.user import User
    client, _ = auth_client
    admin, _ = admin_client
    b = await _unclaimed_business(city)

    # Shared fixture phones have 11 digits after +91; the claimant needs a real-format mobile
    engine = _make_engine()
    Session = async_sessionmaker(engine, expire_on_commit=False)
    phone = f"+917{uuid.uuid4().int % 10**9:09d}"
    async with Session() as s:
        user = User(phone=phone, name="Email Claimant")
        s.add(user)
        await s.commit()
        await s.refresh(user)
    await engine.dispose()

    body = {"business_id": str(b.id), "phone": phone[3:], "note": "GST cert by email"}
    assert (await client.post("/api/v1/admin/business-claims/email", json=body)).status_code == 403

    missing = await admin.post("/api/v1/admin/business-claims/email", json={**body, "phone": "9000000001"})
    assert missing.status_code == 404

    ok = await admin.post("/api/v1/admin/business-claims/email", json=body)
    assert ok.status_code == 200
    assert await _owner_of(b.id) == user.id


@pytest.mark.asyncio
async def test_documents_reject_bad_input(auth_client, city):
    client, _ = auth_client
    b = await _unclaimed_business(city)
    bad_type = await client.post(
        f"/api/v1/businesses/{b.id}/claim/documents",
        data={"doc_type": "aadhaar", "contact_phone": "9848022338"}, files=_doc_files(),
    )
    assert bad_type.status_code == 400
    bad_phone = await client.post(
        f"/api/v1/businesses/{b.id}/claim/documents",
        data={"doc_type": "gst", "contact_phone": "12345"}, files=_doc_files(),
    )
    assert bad_phone.status_code == 400
