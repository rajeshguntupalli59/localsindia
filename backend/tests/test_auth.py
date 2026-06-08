import pytest
from unittest.mock import patch


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


# TC-004: Valid OTP verify creates user and returns JWT
@pytest.mark.asyncio
async def test_otp_verify_creates_user_and_returns_jwt(client, db):
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
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["phone"] == phone


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
