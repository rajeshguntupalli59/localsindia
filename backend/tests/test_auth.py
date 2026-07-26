import pytest
from unittest.mock import patch
from sqlalchemy import select

from app.models.user import User


# TC-001: Valid Indian number gets OTP (mock mode)
@pytest.mark.asyncio
async def test_otp_send_valid_number(client):
    resp = await client.post("/api/v1/auth/otp/send", json={"phone": "+919876543210"})
    assert resp.status_code == 200
    assert "expires_in" in resp.json()


# TC-002: Non-Indian number rejected with 422
@pytest.mark.asyncio
async def test_otp_send_invalid_number(client):
    resp = await client.post("/api/v1/auth/otp/send", json={"phone": "+14155552671"})
    assert resp.status_code == 422


# TC-002b: Indian number wrong format rejected
@pytest.mark.asyncio
async def test_otp_send_malformed_number(client):
    resp = await client.post("/api/v1/auth/otp/send", json={"phone": "9876543210"})
    assert resp.status_code == 422


# TC-003: 3 failed OTP attempts locks account for 15 minutes
@pytest.mark.asyncio
async def test_otp_lockout_after_three_failures(client):
    phone = "+919111111111"

    # Send OTP first
    await client.post("/api/v1/auth/otp/send", json={"phone": phone})

    # Fail 3 times with wrong OTP
    for _ in range(3):
        resp = await client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": "000000"})

    # 4th attempt should be locked
    resp = await client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": "000000"})
    assert resp.status_code == 429


# TC-004: Valid OTP verify creates user and returns a setup_token (not full tokens)
@pytest.mark.asyncio
async def test_otp_verify_creates_user_and_returns_setup_token(client, db):
    from app.core.security import generate_otp, hash_password
    from app.models.otp_request import OtpRequest
    from datetime import datetime, timezone, timedelta

    phone = "+919222222222"
    otp = generate_otp()

    record = OtpRequest(
        phone=phone,
        otp_hash=hash_password(otp),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(record)
    await db.commit()

    resp = await client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": otp})
    assert resp.status_code == 200
    data = resp.json()
    assert "setup_token" in data
    assert data["has_password"] is False
    assert data["is_new_user"] is True


async def _verify_otp_get_setup_token(client, db, phone: str) -> str:
    from app.core.security import generate_otp, hash_password
    from app.models.otp_request import OtpRequest
    from datetime import datetime, timezone, timedelta

    otp = generate_otp()
    record = OtpRequest(
        phone=phone,
        otp_hash=hash_password(otp),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(record)
    await db.commit()
    resp = await client.post("/api/v1/auth/otp/verify", json={"phone": phone, "otp": otp})
    return resp.json()["setup_token"]


# ── Password set (signup) ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_set_password_after_otp_verify(client, db):
    phone = "+919444444444"
    setup_token = await _verify_otp_get_setup_token(client, db, phone)

    resp = await client.post("/api/v1/auth/password/set", json={
        "setup_token": setup_token, "password": "supersecret1",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["phone"] == phone


@pytest.mark.asyncio
async def test_set_password_reports_is_new_user_for_fresh_signup(client, db):
    """Regression: this endpoint used to hardcode is_new_user=False always,
    so the frontend's "what's your name" step never fired for anyone —
    accounts stayed stuck with name==phone forever."""
    phone = "+919444444446"
    setup_token = await _verify_otp_get_setup_token(client, db, phone)

    resp = await client.post("/api/v1/auth/password/set", json={
        "setup_token": setup_token, "password": "supersecret1",
    })
    assert resp.json()["is_new_user"] is True


@pytest.mark.asyncio
async def test_set_password_reports_not_new_once_name_is_set(client, db):
    phone = "+919444444447"
    setup_token = await _verify_otp_get_setup_token(client, db, phone)
    resp = await client.post("/api/v1/auth/password/set", json={
        "setup_token": setup_token, "password": "supersecret1",
    })
    token = resp.json()["access_token"]

    await client.patch(
        "/api/v1/auth/me",
        json={"name": "Real Name"},
        headers={"Authorization": f"Bearer {token}"},
    )

    reset_token = await _verify_otp_get_setup_token(client, db, phone)
    resp = await client.post("/api/v1/auth/password/set", json={
        "setup_token": reset_token, "password": "newpassword1",
    })
    assert resp.json()["is_new_user"] is False


@pytest.mark.asyncio
async def test_set_password_rejects_short_password(client, db):
    phone = "+919444444445"
    setup_token = await _verify_otp_get_setup_token(client, db, phone)

    resp = await client.post("/api/v1/auth/password/set", json={
        "setup_token": setup_token, "password": "short",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_set_password_rejects_invalid_setup_token(client):
    resp = await client.post("/api/v1/auth/password/set", json={
        "setup_token": "not-a-real-token", "password": "supersecret1",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_access_token_cannot_be_used_as_setup_token(client):
    """A normal access token must not double as a password-set credential."""
    from app.core.security import create_access_token, decode_setup_token
    access_token = create_access_token("11111111-1111-1111-1111-111111111111")
    assert decode_setup_token(access_token) is None

    resp = await client.post("/api/v1/auth/password/set", json={
        "setup_token": access_token, "password": "supersecret1",
    })
    assert resp.status_code == 401


# ── Login (phone + password) ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_with_correct_password(client, db):
    phone = "+919555555555"
    setup_token = await _verify_otp_get_setup_token(client, db, phone)
    await client.post("/api/v1/auth/password/set", json={
        "setup_token": setup_token, "password": "supersecret1",
    })

    resp = await client.post("/api/v1/auth/login", json={"phone": phone, "password": "supersecret1"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["phone"] == phone


@pytest.mark.asyncio
async def test_login_with_wrong_password(client, db):
    phone = "+919555555556"
    setup_token = await _verify_otp_get_setup_token(client, db, phone)
    await client.post("/api/v1/auth/password/set", json={
        "setup_token": setup_token, "password": "supersecret1",
    })

    resp = await client.post("/api/v1/auth/login", json={"phone": phone, "password": "wrongpassword"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_no_account(client):
    resp = await client.post("/api/v1/auth/login", json={"phone": "+919666666666", "password": "supersecret1"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_login_account_without_password_yet(client, db):
    phone = "+919555555557"
    await _verify_otp_get_setup_token(client, db, phone)  # creates the user, never sets a password

    resp = await client.post("/api/v1/auth/login", json={"phone": phone, "password": "anything123"})
    assert resp.status_code == 409


# ── Phone check (avoids sending a wasted OTP SMS to an already-registered number) ──

@pytest.mark.asyncio
async def test_phone_check_reports_no_account_for_unknown_number(client):
    resp = await client.post("/api/v1/auth/phone/check", json={"phone": "+919888888881"})
    assert resp.status_code == 200
    assert resp.json()["has_account"] is False


@pytest.mark.asyncio
async def test_phone_check_reports_account_exists_after_password_set(client, db):
    phone = "+919888888882"
    setup_token = await _verify_otp_get_setup_token(client, db, phone)

    # Before a password is set, this is still an incomplete signup — not a real account yet.
    resp = await client.post("/api/v1/auth/phone/check", json={"phone": phone})
    assert resp.json()["has_account"] is False

    await client.post("/api/v1/auth/password/set", json={
        "setup_token": setup_token, "password": "supersecret1",
    })

    resp = await client.post("/api/v1/auth/phone/check", json={"phone": phone})
    assert resp.status_code == 200
    assert resp.json()["has_account"] is True


# ── Forgot password (same set-password endpoint, reused) ────────────────────

@pytest.mark.asyncio
async def test_forgot_password_reset_flow(client, db):
    phone = "+919777777777"
    setup_token = await _verify_otp_get_setup_token(client, db, phone)
    await client.post("/api/v1/auth/password/set", json={
        "setup_token": setup_token, "password": "originalpass1",
    })

    # Simulate "forgot password": verify OTP again to get a fresh setup_token
    reset_token = await _verify_otp_get_setup_token(client, db, phone)
    resp = await client.post("/api/v1/auth/password/set", json={
        "setup_token": reset_token, "password": "newpassword1",
    })
    assert resp.status_code == 200

    # Old password no longer works, new one does
    old = await client.post("/api/v1/auth/login", json={"phone": phone, "password": "originalpass1"})
    assert old.status_code == 401
    new = await client.post("/api/v1/auth/login", json={"phone": phone, "password": "newpassword1"})
    assert new.status_code == 200


# ── Profile (/auth/me) ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_me_reports_zero_listings_for_new_user(client, db):
    phone = "+919888888883"
    setup_token = await _verify_otp_get_setup_token(client, db, phone)
    signup = await client.post("/api/v1/auth/password/set", json={
        "setup_token": setup_token, "password": "supersecret1",
    })
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

    resp = await client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["listing_count"] == 0


# Regression test for a real bug: the mobile Profile screen's "X Listings" stat
# read `me.listing_count`, but /auth/me never returned that field at all — so
# it silently stayed at its default of 0 forever, no matter how many listings
# the user actually had.
@pytest.mark.asyncio
async def test_me_reports_correct_listing_count_and_excludes_deleted(client, db):
    from app.models.category import Category
    from app.models.city import City
    from app.models.listing import Listing

    phone = "+919888888884"
    setup_token = await _verify_otp_get_setup_token(client, db, phone)
    signup = await client.post("/api/v1/auth/password/set", json={
        "setup_token": setup_token, "password": "supersecret1",
    })
    user_id = signup.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

    city = City(name="Test City", slug="test-city-count", state="Test State", lang_default="en")
    category = Category(name="Test Cat", slug="test-cat-count")
    db.add_all([city, category])
    await db.commit()
    await db.refresh(city)
    await db.refresh(category)

    listings = [
        Listing(
            user_id=user_id, city_id=city.id, category_id=category.id,
            title=f"Listing {i}", description="Some description here",
            contact_phone=phone, status="active",
        )
        for i in range(3)
    ]
    db.add_all(listings)
    await db.commit()
    for l in listings:
        await db.refresh(l)

    # One is already soft-deleted — must not count.
    from datetime import datetime, timezone
    listings[0].deleted_at = datetime.now(timezone.utc)
    await db.commit()

    resp = await client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["listing_count"] == 2


# ── Account deletion ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_account_anonymises_user_and_hides_listings(client, db):
    from app.models.category import Category
    from app.models.city import City
    from app.models.listing import Listing

    phone = "+919555555555"
    setup_token = await _verify_otp_get_setup_token(client, db, phone)
    signup = await client.post("/api/v1/auth/password/set", json={
        "setup_token": setup_token, "password": "supersecret1",
    })
    access_token = signup.json()["access_token"]
    user_id = signup.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {access_token}"}

    city = City(name="Test City", slug="test-city-del", state="Test State", lang_default="en")
    category = Category(name="Test Cat", slug="test-cat-del")
    db.add_all([city, category])
    await db.commit()
    await db.refresh(city)
    await db.refresh(category)

    listing = Listing(
        user_id=user_id, city_id=city.id, category_id=category.id,
        title="A listing to be hidden", description="Some description here",
        contact_phone=phone, status="active",
    )
    db.add(listing)
    await db.commit()
    await db.refresh(listing)
    listing_id = listing.id

    resp = await client.delete("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 204

    # Account is gone from the caller's perspective — token no longer resolves to a live user
    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 401

    # The endpoint committed via a different session — expire this session's identity map
    # so re-querying the listing sees the update rather than the pre-delete cached row.
    db.expire_all()

    result = await db.execute(select(User).where(User.id == user_id))
    deleted_user = result.scalar_one()
    assert deleted_user.deleted_at is not None
    assert deleted_user.is_active is False
    assert deleted_user.phone is None
    assert deleted_user.name == "Deleted User"

    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    deleted_listing = result.scalar_one()
    assert deleted_listing.deleted_at is not None


@pytest.mark.asyncio
async def test_delete_account_requires_auth(client):
    resp = await client.delete("/api/v1/auth/me")
    assert resp.status_code == 403


# TC-017: 6th OTP request in 1 hour returns 429
@pytest.mark.asyncio
async def test_otp_rate_limit_per_hour(client):
    phone = "+919333333333"

    # Send 5 OTPs (the limit)
    for _ in range(5):
        await client.post("/api/v1/auth/otp/send", json={"phone": phone})

    # 6th should be rate-limited
    resp = await client.post("/api/v1/auth/otp/send", json={"phone": phone})
    assert resp.status_code == 429


# Health check sanity
@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
