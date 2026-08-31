import logging
import re
import secrets
import urllib.parse
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status

logger = logging.getLogger(__name__)
from fastapi.responses import RedirectResponse
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import (
    hash_password, verify_password, generate_otp,
    create_access_token, create_refresh_token, decode_token,
    create_setup_token, decode_setup_token,
)
from app.models.otp_request import OtpRequest
from app.models.user import User
from app.models.listing import Listing
from app.core.deps import get_current_user
from app.schemas.auth import (
    OtpSendRequest, OtpVerifyRequest, AuthResponse,
    RefreshRequest, TokenResponse, UserOut, ProfileUpdate, AdminLoginRequest,
    OtpVerifyResponse, LoginRequest, SetPasswordRequest,
)
from app.services import msg91, recaptcha

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


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Returning-user login — phone + password."""
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
    if not user.password_hash:
        raise HTTPException(
            status_code=409,
            detail="This account doesn't have a password yet. Use \"Forgot password\" to set one.",
        )
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect phone number or password.")
    return AuthResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=UserOut.model_validate(user),
        is_new_user=False,
    )


@router.post("/phone/check")
@limiter.limit("15/minute")
async def check_phone(request: Request, body: OtpSendRequest, db: AsyncSession = Depends(get_db)):
    """Check whether a phone number already has a password-set account.

    Lets the signup flow warn the user before sending an OTP SMS, instead of
    burning a real SMS credit only to tell them afterwards to sign in instead.
    Per-IP rate limited to block phone-number enumeration by bots.
    """
    result = await db.execute(
        select(User).where(User.phone == body.phone, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    return {"has_account": bool(user and user.password_hash)}


def _is_browser_request(request: Request) -> bool:
    """Browsers send Origin/Referer on cross-origin fetch/XHR calls; native
    mobile HTTP clients (React Native's fetch/axios, used by mobile/src/lib/api.ts)
    do not. Used to scope the reCAPTCHA requirement to the web frontend — the
    mobile app has no reCAPTCHA integration (RN can't run the JS widget as-is),
    so enforcing it unconditionally silently breaks every mobile OTP send."""
    return bool(request.headers.get("origin") or request.headers.get("referer"))


@router.post("/otp/send", status_code=200)
@limiter.limit("3/minute")
@limiter.limit("6/hour")
async def send_otp(request: Request, body: OtpSendRequest, db: AsyncSession = Depends(get_db)):
    phone = body.phone
    now = datetime.now(timezone.utc)

    # Blocks distributed bots the per-IP limit can't catch (many source IPs,
    # each under the cap) — requires human interaction regardless of source IP.
    # Any caller that supplies a token must pass verification (web always
    # sends one; the mobile app does too now, via a WebView-embedded widget —
    # see mobile/src/lib/recaptcha.tsx). A token-less request is only allowed
    # through when it doesn't look like a browser: mobile app installs from
    # before the WebView widget shipped can't produce a token at all, and
    # rejecting them would repeat the outage this replaced — see
    # _is_browser_request and the 2026-08-31 incident writeup in
    # PROJECT_MAP.md. Browsers always send one, so a token-less browser
    # request is either a bug or a bot skipping the widget outright.
    if body.recaptcha_token:
        if not await recaptcha.verify_otp_send(body.recaptcha_token):
            raise HTTPException(status_code=400, detail="Verification failed. Please try again.")
    elif _is_browser_request(request):
        raise HTTPException(status_code=400, detail="Verification failed. Please try again.")

    # Per-IP rate limit (above) stops a bot rotating through many phone numbers
    # to burn SMS credits — the per-phone limit below only protects one number.

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


async def _generate_referral_code(db: AsyncSession) -> str:
    """8-char uppercase code, retried on the astronomically rare collision."""
    for _ in range(5):
        code = secrets.token_hex(4).upper()
        exists = await db.execute(select(User.id).where(User.referral_code == code))
        if not exists.scalar_one_or_none():
            return code
    raise HTTPException(status_code=500, detail="Could not generate a referral code. Try again.")


@router.post("/otp/verify", response_model=OtpVerifyResponse)
@limiter.limit("10/minute")
async def verify_otp(request: Request, body: OtpVerifyRequest, db: AsyncSession = Depends(get_db)):
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
        user.referral_code = await _generate_referral_code(db)
        if body.ref_code:
            referrer = await db.execute(
                select(User).where(User.referral_code == body.ref_code.upper())
            )
            referrer_user = referrer.scalar_one_or_none()
            if referrer_user:
                user.referred_by_user_id = referrer_user.id
        db.add(user)
        is_new = True
    elif not user.is_active:
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Contact support.")

    await db.commit()
    await db.refresh(user)

    return OtpVerifyResponse(
        setup_token=create_setup_token(str(user.id)),
        has_password=bool(user.password_hash),
        is_new_user=is_new,
    )


@router.post("/password/set", response_model=AuthResponse)
async def set_password(body: SetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Set (signup) or reset (forgot-password) a user's password.
    Requires a short-lived setup_token proving a recent OTP verification —
    same endpoint serves both flows since the action is identical."""
    user_id = decode_setup_token(body.setup_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Verification expired. Please verify your phone again.")

    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Contact support.")

    # This endpoint serves both signup (fresh account, name still the
    # phone-number placeholder from otp/verify's User(phone=phone, name=phone))
    # and forgot-password reset (name already set for real) — name == phone
    # is the actual signal for "has this account ever completed profile
    # setup", not whether the row itself is brand new.
    is_new = user.name == user.phone

    user.password_hash = hash_password(body.password)
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
    user_id = decode_token(body.refresh_token, expected_type="refresh")
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
async def get_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Lazily backfill referral codes for users who signed up before this
    # feature existed — no migration/backfill script needed, self-operating.
    if not current_user.referral_code:
        current_user.referral_code = await _generate_referral_code(db)
        await db.commit()
        await db.refresh(current_user)

    out = UserOut.model_validate(current_user)
    count_result = await db.execute(
        select(func.count()).select_from(Listing).where(
            Listing.user_id == current_user.id,
            Listing.deleted_at.is_(None),
        )
    )
    out.listing_count = count_result.scalar() or 0
    return out


@router.delete("/me", status_code=204)
async def delete_account(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete the account and anonymise PII (BL: soft-delete only, never hard-delete).
    Frees up the phone/email for reuse and hides the user's listings, since their
    contact details no longer exist once anonymised."""
    now = datetime.now(timezone.utc)

    await db.execute(
        update(Listing)
        .where(Listing.user_id == current_user.id, Listing.deleted_at.is_(None))
        .values(deleted_at=now)
    )

    current_user.deleted_at = now
    current_user.is_active = False
    current_user.name = "Deleted User"
    current_user.phone = None
    current_user.email = None
    current_user.password_hash = None
    current_user.avatar_url = None
    await db.commit()


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
