"""
Referral system tests — signup attribution via /otp/verify and the
two-sided reward trigger on approve_listing.

Both touched endpoints are live, pre-existing production codepaths, so the
first test in each section is a REGRESSION test: proving the referral
change didn't alter behavior for the (overwhelmingly common) non-referral
case.
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy import select

from app.core.security import generate_otp, hash_password
from app.models.otp_request import OtpRequest
from app.models.user import User
from app.models.listing import Listing


async def _verify_new_user(client, db, phone, ref_code=None):
    otp = generate_otp()
    record = OtpRequest(
        phone=phone,
        otp_hash=hash_password(otp),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(record)
    await db.commit()
    payload = {"phone": phone, "otp": otp}
    if ref_code is not None:
        payload["ref_code"] = ref_code
    return await client.post("/api/v1/auth/otp/verify", json=payload)


# ── Signup attribution (POST /otp/verify) ──────────────────────────────────────

@pytest.mark.asyncio
async def test_signup_without_ref_code_is_unaffected(client, db):
    """REGRESSION: the vast majority of signups send no ref_code at all —
    this must behave exactly as it did before the referral feature existed."""
    phone = "+919333300001"
    resp = await _verify_new_user(client, db, phone)
    assert resp.status_code == 200
    assert resp.json()["is_new_user"] is True

    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one()
    assert user.referred_by_user_id is None


@pytest.mark.asyncio
async def test_signup_generates_own_referral_code(client, db):
    """Every new user gets their own shareable code, even if no one referred them."""
    phone = "+919333300002"
    await _verify_new_user(client, db, phone)

    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one()
    assert user.referral_code is not None
    assert len(user.referral_code) == 8


@pytest.mark.asyncio
async def test_signup_with_valid_ref_code_sets_attribution(client, db):
    referrer = User(phone="+919333300003", name="Referrer", referral_code="ABCD1234")
    db.add(referrer)
    await db.commit()
    await db.refresh(referrer)

    phone = "+919333300004"
    # Lowercase on purpose — the endpoint uppercases before matching.
    resp = await _verify_new_user(client, db, phone, ref_code="abcd1234")
    assert resp.status_code == 200

    result = await db.execute(select(User).where(User.phone == phone))
    new_user = result.scalar_one()
    assert new_user.referred_by_user_id == referrer.id


@pytest.mark.asyncio
async def test_signup_with_unknown_ref_code_ignored_silently(client, db):
    """A stale/invalid code must never block signup — just no attribution."""
    phone = "+919333300005"
    resp = await _verify_new_user(client, db, phone, ref_code="NOSUCH1X")
    assert resp.status_code == 200

    result = await db.execute(select(User).where(User.phone == phone))
    new_user = result.scalar_one()
    assert new_user.referred_by_user_id is None


@pytest.mark.asyncio
async def test_existing_user_ref_code_never_applied(client, db):
    """An already-registered user re-verifying (e.g. login OTP) must never
    be retroactively attributed, even if a ref_code is present."""
    phone = "+919333300006"
    await _verify_new_user(client, db, phone)  # first signup

    referrer = User(phone="+919333300007", name="Referrer2", referral_code="ZZZZ9999")
    db.add(referrer)
    await db.commit()

    resp = await _verify_new_user(client, db, phone, ref_code="ZZZZ9999")
    assert resp.status_code == 200
    assert resp.json()["is_new_user"] is False

    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one()
    assert user.referred_by_user_id is None


# ── Reward trigger (PATCH /admin/listings/{id}/approve) ────────────────────────

async def _make_listing(db, user, city, category, status="pending"):
    listing = Listing(
        user_id=user.id,
        city_id=city.id,
        category_id=category.id,
        title="Test listing",
        description="Test description",
        contact_phone="+919876543210",
        status=status,
    )
    db.add(listing)
    await db.commit()
    await db.refresh(listing)
    return listing


@pytest.mark.asyncio
async def test_approve_with_no_referrer_is_unaffected(admin_client, db, city, category):
    """REGRESSION: the vast majority of listings belong to users with no
    referrer at all — approval must behave exactly as before."""
    admin_ac, _admin = admin_client
    owner = User(phone="+919333300008", name="Organic User")
    db.add(owner)
    await db.commit()
    await db.refresh(owner)

    listing = await _make_listing(db, owner, city, category)
    resp = await admin_ac.patch(f"/api/v1/admin/listings/{listing.id}/approve")
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"
    assert resp.json()["is_featured"] is False


@pytest.mark.asyncio
async def test_approve_first_referred_listing_rewards_both_sides(admin_client, db, city, category):
    admin_ac, _admin = admin_client
    referrer = User(phone="+919333300009", name="Referrer3", referral_code="R3R3R3R3")
    db.add(referrer)
    await db.commit()
    await db.refresh(referrer)

    referrer_listing = await _make_listing(db, referrer, city, category, status="active")

    referred = User(phone="+919333300010", name="Referred User", referred_by_user_id=referrer.id)
    db.add(referred)
    await db.commit()
    await db.refresh(referred)

    new_listing = await _make_listing(db, referred, city, category)
    resp = await admin_ac.patch(f"/api/v1/admin/listings/{new_listing.id}/approve")
    assert resp.status_code == 200
    assert resp.json()["is_featured"] is True

    await db.refresh(referrer_listing)
    await db.refresh(referrer)
    assert referrer_listing.is_featured is True
    assert referrer.referral_rewards_count == 1


@pytest.mark.asyncio
async def test_approve_second_referred_listing_does_not_double_reward(admin_client, db, city, category):
    """Only the referred user's FIRST approved listing triggers a reward."""
    admin_ac, _admin = admin_client
    referrer = User(phone="+919333300011", name="Referrer4", referral_code="R4R4R4R4")
    db.add(referrer)
    await db.commit()
    await db.refresh(referrer)

    referred = User(phone="+919333300012", name="Referred User2", referred_by_user_id=referrer.id)
    db.add(referred)
    await db.commit()
    await db.refresh(referred)

    first_listing = await _make_listing(db, referred, city, category, status="active")
    second_listing = await _make_listing(db, referred, city, category)

    resp = await admin_ac.patch(f"/api/v1/admin/listings/{second_listing.id}/approve")
    assert resp.status_code == 200
    assert resp.json()["is_featured"] is False  # second listing — no reward

    await db.refresh(referrer)
    assert referrer.referral_rewards_count == 0


@pytest.mark.asyncio
async def test_approve_referrer_at_cap_skips_reward(admin_client, db, city, category):
    from app.routers.admin import REFERRAL_REWARD_CAP

    admin_ac, _admin = admin_client
    referrer = User(
        phone="+919333300013", name="Referrer5", referral_code="R5R5R5R5",
        referral_rewards_count=REFERRAL_REWARD_CAP,
    )
    db.add(referrer)
    await db.commit()
    await db.refresh(referrer)

    referred = User(phone="+919333300014", name="Referred User3", referred_by_user_id=referrer.id)
    db.add(referred)
    await db.commit()
    await db.refresh(referred)

    listing = await _make_listing(db, referred, city, category)
    resp = await admin_ac.patch(f"/api/v1/admin/listings/{listing.id}/approve")
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"  # still approves
    assert resp.json()["is_featured"] is False  # but no reward — cap hit

    await db.refresh(referrer)
    assert referrer.referral_rewards_count == REFERRAL_REWARD_CAP


@pytest.mark.asyncio
async def test_approve_deactivated_referrer_skips_reward_no_crash(admin_client, db, city, category):
    admin_ac, _admin = admin_client
    referrer = User(
        phone="+919333300015", name="Referrer6", referral_code="R6R6R6R6",
        is_active=False,
    )
    db.add(referrer)
    await db.commit()
    await db.refresh(referrer)

    referred = User(phone="+919333300016", name="Referred User4", referred_by_user_id=referrer.id)
    db.add(referred)
    await db.commit()
    await db.refresh(referred)

    listing = await _make_listing(db, referred, city, category)
    resp = await admin_ac.patch(f"/api/v1/admin/listings/{listing.id}/approve")
    assert resp.status_code == 200  # never crashes, approval still succeeds
    assert resp.json()["is_featured"] is False


# ── Observability (/admin/stats referral counters) ──────────────────────────────

@pytest.mark.asyncio
async def test_get_me_backfills_referral_code_for_pre_feature_users(auth_client, db):
    """Users who signed up before this feature existed have referral_code=None.
    GET /me must lazily generate one — no backfill migration required."""
    ac, user = auth_client
    assert user.referral_code is None  # user_and_token fixture predates the feature

    resp = await ac.get("/api/v1/auth/me")
    assert resp.status_code == 200
    assert resp.json()["referral_code"] is not None

    result = await db.execute(select(User).where(User.id == user.id))
    refreshed = result.scalar_one()
    assert refreshed.referral_code is not None


@pytest.mark.asyncio
async def test_admin_stats_includes_referral_counters(admin_client, db, city, category):
    admin_ac, _admin = admin_client
    referrer = User(phone="+919333300017", name="Referrer7", referral_code="R7R7R7R7")
    db.add(referrer)
    await db.commit()
    await db.refresh(referrer)

    referred = User(phone="+919333300018", name="Referred User5", referred_by_user_id=referrer.id)
    db.add(referred)
    await db.commit()

    resp = await admin_ac.get("/api/v1/admin/stats")
    assert resp.status_code == 200
    referrals = resp.json()["referrals"]
    assert referrals["signups"] >= 1
    assert "rewards_granted" in referrals
    assert "referrers_at_cap" in referrals
