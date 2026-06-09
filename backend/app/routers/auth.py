import re
import urllib.parse
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password, generate_otp,
    create_access_token, create_refresh_token, decode_token,
)
from app.models.otp_request import OtpRequest
from app.models.user import User
from app.schemas.auth import (
    OtpSendRequest, OtpVerifyRequest, AuthResponse,
    RefreshRequest, TokenResponse, UserOut,
)
from app.services import msg91

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

PHONE_RE = re.compile(r"^\+91[6-9]\d{9}$")
OTP_WINDOW_MINUTES = 60
OTP_MAX_PER_WINDOW = 5
OTP_MAX_ATTEMPTS = 3
OTP_LOCKOUT_MINUTES = 15
OTP_EXPIRE_MINUTES = 10


@router.post("/otp/send", status_code=200)
async def send_otp(body: OtpSendRequest, db: AsyncSession = Depends(get_db)):
    phone = body.phone
    now = datetime.now(timezone.utc)

    # Rate limit: max 5 OTPs per phone per hour (BL-07)
    window_start = now - timedelta(minutes=OTP_WINDOW_MINUTES)
    count_result = await db.execute(
        select(func.count()).select_from(OtpRequest)
        .where(OtpRequest.phone == phone, OtpRequest.created_at >= window_start)
    )
    if count_result.scalar() >= OTP_MAX_PER_WINDOW:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Try again in 1 hour.")

    # Check if phone is locked out (3 failed attempts in last 15 min)
    lockout_start = now - timedelta(minutes=OTP_LOCKOUT_MINUTES)
    recent = await db.execute(
        select(OtpRequest)
        .where(
            OtpRequest.phone == phone,
            OtpRequest.created_at >= lockout_start,
            OtpRequest.verified == False,
            OtpRequest.attempts >= OTP_MAX_ATTEMPTS,
        )
        .limit(1)
    )
    if recent.scalar_one_or_none():
        raise HTTPException(status_code=429, detail="Account locked for 15 minutes due to failed attempts.")

    otp = generate_otp()
    otp_hash = hash_password(otp)

    otp_record = OtpRequest(phone=phone, otp_hash=otp_hash)
    db.add(otp_record)
    await db.commit()

    if settings.OTP_DEBUG:
        # Debug mode: skip SMS, return OTP in response for testing without DLT
        logger.warning(f"[OTP_DEBUG] OTP for {phone}: {otp}")
        return {"message": "OTP sent successfully", "expires_in": OTP_EXPIRE_MINUTES * 60, "otp": otp}

    sent = await msg91.send_otp(phone, otp)
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send OTP. Try again.")

    return {"message": "OTP sent successfully", "expires_in": OTP_EXPIRE_MINUTES * 60}


@router.post("/otp/verify", response_model=AuthResponse)
async def verify_otp(body: OtpVerifyRequest, db: AsyncSession = Depends(get_db)):
    phone = body.phone
    now = datetime.now(timezone.utc)

    # Get latest unexpired, unverified OTP for this phone
    result = await db.execute(
        select(OtpRequest)
        .where(
            OtpRequest.phone == phone,
            OtpRequest.verified == False,
            OtpRequest.expires_at > now,
        )
        .order_by(OtpRequest.created_at.desc())
        .limit(1)
    )
    otp_record = result.scalar_one_or_none()

    if not otp_record:
        raise HTTPException(status_code=400, detail="OTP expired or not found. Request a new one.")

    # Increment attempts before checking (BL-06)
    otp_record.attempts += 1
    await db.flush()

    if otp_record.attempts > OTP_MAX_ATTEMPTS:
        await db.commit()
        raise HTTPException(status_code=429, detail="Too many failed attempts. Account locked for 15 minutes.")

    if not verify_password(body.otp, otp_record.otp_hash):
        await db.commit()
        raise HTTPException(status_code=400, detail="Invalid OTP.")

    otp_record.verified = True

    # Get or create user
    user_result = await db.execute(select(User).where(User.phone == phone))
    user = user_result.scalar_one_or_none()

    if not user:
        user = User(phone=phone, name=phone)  # name updated on profile setup
        db.add(user)

    await db.commit()
    await db.refresh(user)

    return AuthResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=UserOut.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    user_id = decode_token(body.refresh_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token.")

    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.delete("/logout", status_code=204)
async def logout():
    # JWT is stateless — client drops the token
    return


# ─── Google OAuth ─────────────────────────────────────────────

@router.get("/google")
async def google_oauth_start():
    """Redirect user to Google's OAuth consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google OAuth not configured — add GOOGLE_CLIENT_ID to .env")
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return RedirectResponse(url)


@router.get("/google/callback")
async def google_oauth_callback(
    code: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Exchange Google code for user profile, upsert user, redirect to frontend with JWT."""
    if error or not code:
        return RedirectResponse(f"{settings.FRONTEND_URL}/auth/login?error=google_denied")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_res = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            token_data = token_res.json()
            if "error" in token_data:
                return RedirectResponse(f"{settings.FRONTEND_URL}/auth/login?error=token_exchange")

            profile_res = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            g_user = profile_res.json()
    except Exception:
        return RedirectResponse(f"{settings.FRONTEND_URL}/auth/login?error=google_error")

    email = g_user.get("email")
    name = g_user.get("name") or email or "User"
    avatar_url = g_user.get("picture")

    if not email:
        return RedirectResponse(f"{settings.FRONTEND_URL}/auth/login?error=no_email")

    # Upsert user by email
    result = await db.execute(select(User).where(User.email == email, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()

    if not user:
        user = User(email=email, name=name, avatar_url=avatar_url)
        db.add(user)
    else:
        if avatar_url:
            user.avatar_url = avatar_url
        if name and user.name == user.email:
            user.name = name

    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    name_enc = urllib.parse.quote(user.name or "")
    return RedirectResponse(
        f"{settings.FRONTEND_URL}/auth/callback?token={access_token}&refresh={refresh}&name={name_enc}"
    )
