import logging
import re
import urllib.parse
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

logger = logging.getLogger(__name__)
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
from app.core.deps import get_current_user
from app.schemas.auth import (
    OtpSendRequest, OtpVerifyRequest, AuthResponse,
    RefreshRequest, TokenResponse, UserOut, ProfileUpdate, AdminLoginRequest,
)
from app.services import msg91

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

PHONE_RE = re.compile(r"^\+91[6-9]\d{9}$")
OTP_WINDOW_MINUTES = 60
OTP_MAX_PER_WINDOW = 5
OTP_MAX_ATTEMPTS = 3
OTP_LOCKOUT_MINUTES = 15
OTP_EXPIRE_MINUTES = 10


@router.post("/admin-login", response_model=AuthResponse)
async def admin_login(body: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    """Admin login with username + password — credentials stored as Azure env vars."""
    if not settings.ADMIN_USERNAME or not settings.ADMIN_PASSWORD_HASH:
        raise HTTPException(status_code=503, detail="Admin credentials not configured.")
    if body.username != settings.ADMIN_USERNAME:
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    if not verify_password(body.password, settings.ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    # +910000000001 is an internal marker — impossible for real Indian mobiles (+91[6-9]...)
    ADMIN_PHONE = "+910000000001"
    result = await db.execute(select(User).where(User.phone == ADMIN_PHONE))
    admin_user = result.scalar_one_or_none()
    if not admin_user:
        admin_user = User(phone=ADMIN_PHONE, name=settings.ADMIN_USERNAME, role="admin")
        db.add(admin_user)
        await db.commit()
        await db.refresh(admin_user)
    elif admin_user.role != "admin":
        admin_user.role = "admin"
        await db.commit()
        await db.refresh(admin_user)

    return AuthResponse(
        access_token=create_access_token(str(admin_user.id)),
        refresh_token=create_refresh_token(str(admin_user.id)),
        user=UserOut.model_validate(admin_user),
    )


@router.post("/signin", response_model=AuthResponse)
async def direct_signin(body: OtpSendRequest, db: AsyncSession = Depends(get_db)):
    """Sign in an existing user directly — no OTP required (phone already verified at signup)."""
    result = await db.execute(
        select(User).where(User.phone == body.phone, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="No account found for this number. Please create a new account.",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Contact support.")
    return AuthResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=UserOut.model_validate(user),
        is_new_user=False,
    )


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

    sent, msg91_data = await msg91.send_otp(phone, otp)
    if not sent:
        err = msg91_data.get("message") or str(msg91_data)
        raise HTTPException(status_code=500, detail=f"SMS failed: {err}")

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

    is_new = False
    if not user:
        user = User(phone=phone, name=phone)  # name updated on profile setup
        db.add(user)
        is_new = True
    elif not user.is_active:
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Contact support.")

    await db.commit()
    await db.refresh(user)

    return AuthResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=UserOut.model_validate(user),
        is_new_user=is_new,
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


@router.post("/dev-login", response_model=AuthResponse)
async def dev_login(db: AsyncSession = Depends(get_db)):
    """Dev-only bypass — only works when OTP_DEBUG=true."""
    if not settings.OTP_DEBUG:
        raise HTTPException(status_code=403, detail="Not available in production.")
    phone = "+919999999999"
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if not user:
        user = User(phone=phone, name="Dev User", role="admin")
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif user.role != "admin":
        user.role = "admin"
        await db.commit()
        await db.refresh(user)
    return AuthResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=UserOut.model_validate(user),
    )


# ─── Profile ──────────────────────────────────────────────────

@router.patch("/me", response_model=UserOut)
async def update_profile(
    body: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.name is not None:
        current_user.name = body.name.strip()
    if body.lang_pref is not None:
        current_user.lang_pref = body.lang_pref
    await db.commit()
    await db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


# ─── Google OAuth ─────────────────────────────────────────────

@router.get("/google")
async def google_oauth_start(mobile: bool = False):
    """Redirect user to Google's OAuth consent screen.
    Pass ?mobile=1 from the mobile app to get a deep-link callback instead of web."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google OAuth not configured — add GOOGLE_CLIENT_ID to .env")
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": "mobile" if mobile else "web",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return RedirectResponse(url)


@router.get("/google/callback")
async def google_oauth_callback(
    code: str | None = None,
    error: str | None = None,
    state: str = "web",
    db: AsyncSession = Depends(get_db),
):
    """Exchange Google code for user profile, upsert user, redirect to frontend with JWT.
    When state='mobile', redirects to localsindia:// deep link for the mobile app."""
    is_mobile = state == "mobile"
    error_redirect = (
        "localsindia://auth/callback?error=google_denied"
        if is_mobile
        else f"{settings.FRONTEND_URL}/auth/login?error=google_denied"
    )

    if error or not code:
        return RedirectResponse(error_redirect)

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
                return RedirectResponse(error_redirect)

            profile_res = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            g_user = profile_res.json()
    except Exception:
        return RedirectResponse(error_redirect)

    email = g_user.get("email")
    name = g_user.get("name") or email or "User"
    avatar_url = g_user.get("picture")

    if not email:
        return RedirectResponse(error_redirect)

    # Upsert user by email
    result = await db.execute(select(User).where(User.email == email, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()

    if not user:
        user = User(email=email, name=name, avatar_url=avatar_url)
        db.add(user)
    else:
        if not user.is_active:
            redirect = (
                "localsindia://auth/callback?error=account_deactivated"
                if is_mobile
                else f"{settings.FRONTEND_URL}/auth/login?error=account_deactivated"
            )
            return RedirectResponse(redirect)
        if avatar_url:
            user.avatar_url = avatar_url
        if name and user.name == user.email:
            user.name = name

    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    name_enc = urllib.parse.quote(user.name or "")

    if is_mobile:
        return RedirectResponse(
            f"localsindia://auth/callback?token={access_token}&refresh={refresh}&name={name_enc}"
        )
    return RedirectResponse(
        f"{settings.FRONTEND_URL}/auth/callback?token={access_token}&refresh={refresh}&name={name_enc}"
    )
