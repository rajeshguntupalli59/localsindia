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
    from app.core.config import settings

    ac, _user = auth_client

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
