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


# Regression test for a real production bug: promoting a listing used to
# overwrite its general `expires_at` with the featured-plan duration (e.g. 7
# days for "week"), and nothing ever un-set `is_featured` once that window
# passed — so paid featured boosts never expired. Fixed by adding a dedicated
# `featured_until` column instead of reusing `expires_at`.
@pytest.mark.asyncio
async def test_verify_featured_payment_sets_featured_until_not_expires_at(client, db, auth_client, city, category):
    from sqlalchemy import select
    from app.models.listing import Listing
    from app.models.payment_order import PaymentOrder
    from app.core.config import settings

    ac, user = auth_client

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Listing to be featured",
        "description": "Should get featured_until set, not expires_at",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    assert create_resp.status_code == 201
    listing_id = create_resp.json()["id"]

    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing_before = result.scalar_one()
    original_expires_at = listing_before.expires_at

    # Verify now sources plan/target from the order record we created
    # ourselves (not the client-supplied verify body) — insert the record
    # a real /featured/create-order call would have made.
    db.add(PaymentOrder(
        razorpay_order_id="order_abc123",
        user_id=user.id,
        kind="featured_listing",
        target_id=listing_id,
        plan="week",
        amount=9900,
    ))
    await db.commit()

    with patch.object(settings, "RAZORPAY_KEY_SECRET", "test_secret"):
        signature = _sign("order_abc123", "pay_xyz789", "test_secret")
        resp = await ac.post("/api/v1/payments/featured/verify", json={
            "razorpay_order_id": "order_abc123",
            "razorpay_payment_id": "pay_xyz789",
            "razorpay_signature": signature,
            "listing_id": listing_id,
            "plan": "week",
        })
    assert resp.status_code == 200

    db.expire_all()
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing_after = result.scalar_one()

    assert listing_after.is_featured is True
    assert listing_after.featured_until is not None
    assert 6 <= (listing_after.featured_until - listing_after.featured_at).days <= 7
    # The bug: expires_at must be untouched by promoting a listing
    assert listing_after.expires_at == original_expires_at


@pytest.mark.asyncio
async def test_verify_featured_payment_rejects_bad_signature(client, auth_client, city, category):
    ac, _user = auth_client

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Listing with bad signature",
        "description": "Verify should reject a forged signature",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    resp = await ac.post("/api/v1/payments/featured/verify", json={
        "razorpay_order_id": "order_abc123",
        "razorpay_payment_id": "pay_xyz789",
        "razorpay_signature": "not-a-real-signature",
        "listing_id": listing_id,
        "plan": "week",
    })
    assert resp.status_code == 400


# Regression tests for a real vulnerability found in a security review: the
# Razorpay signature only proves (order_id, payment_id) belong together —
# it says nothing about which plan or listing was actually paid for. Verify
# used to trust the client-supplied plan/listing_id directly, so someone
# could pay for the cheap "week" plan, then call verify claiming "month" to
# get the longer boost, or replay the same real payment's signature against
# every listing they own. Fixed by sourcing plan/target from the order
# record created server-side at /featured/create-order time, never from
# the verify request body.
@pytest.mark.asyncio
async def test_verify_featured_payment_ignores_client_supplied_plan(client, db, auth_client, city, category):
    """Paying for 'week' and then claiming 'month' in the verify call must
    apply the plan that was actually ordered (week), not the claimed one."""
    from sqlalchemy import select
    from app.models.listing import Listing
    from app.models.payment_order import PaymentOrder
    from app.core.config import settings

    ac, user = auth_client

    create_resp = await ac.post("/api/v1/listings", json={
        "title": "Listing paid for week, claims month",
        "description": "Verify must apply the ordered plan, not the claimed one",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })
    listing_id = create_resp.json()["id"]

    db.add(PaymentOrder(
        razorpay_order_id="order_week_plan",
        user_id=user.id,
        kind="featured_listing",
        target_id=listing_id,
        plan="week",  # actually paid for the cheap plan
        amount=9900,
    ))
    await db.commit()

    with patch.object(settings, "RAZORPAY_KEY_SECRET", "test_secret"):
        signature = _sign("order_week_plan", "pay_week_plan", "test_secret")
        resp = await ac.post("/api/v1/payments/featured/verify", json={
            "razorpay_order_id": "order_week_plan",
            "razorpay_payment_id": "pay_week_plan",
            "razorpay_signature": signature,
            "listing_id": listing_id,
            "plan": "month",  # attacker claims the expensive plan in the request
        })
    assert resp.status_code == 200

    db.expire_all()
    result = await db.execute(select(Listing).where(Listing.id == listing_id))
    listing = result.scalar_one()
    # Must reflect the *ordered* week plan (~7 days), not the claimed month plan
    assert 6 <= (listing.featured_until - listing.featured_at).days <= 7


@pytest.mark.asyncio
async def test_verify_featured_payment_rejects_replay(client, db, auth_client, city, category):
    """The same valid (order_id, payment_id, signature) must not be usable
    twice — e.g. replayed against a second listing the payer owns."""
    from app.models.payment_order import PaymentOrder
    from app.core.config import settings

    ac, user = auth_client

    listing_a = (await ac.post("/api/v1/listings", json={
        "title": "First listing to feature",
        "description": "Gets the real payment applied",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })).json()["id"]

    listing_b = (await ac.post("/api/v1/listings", json={
        "title": "Second listing, should not get featured for free",
        "description": "Attacker replays the same payment here",
        "category_id": str(category.id),
        "city_id": str(city.id),
        "contact_phone": "+919876543210",
    })).json()["id"]

    db.add(PaymentOrder(
        razorpay_order_id="order_replay_test",
        user_id=user.id,
        kind="featured_listing",
        target_id=listing_a,
        plan="week",
        amount=9900,
    ))
    await db.commit()

    with patch.object(settings, "RAZORPAY_KEY_SECRET", "test_secret"):
        signature = _sign("order_replay_test", "pay_replay_test", "test_secret")
        first = await ac.post("/api/v1/payments/featured/verify", json={
            "razorpay_order_id": "order_replay_test",
            "razorpay_payment_id": "pay_replay_test",
            "razorpay_signature": signature,
            "listing_id": listing_a,
            "plan": "week",
        })
        assert first.status_code == 200

        replay = await ac.post("/api/v1/payments/featured/verify", json={
            "razorpay_order_id": "order_replay_test",
            "razorpay_payment_id": "pay_replay_test",
            "razorpay_signature": signature,
            "listing_id": listing_b,  # attacker points the replay at a different listing
            "plan": "week",
        })
    assert replay.status_code == 400
