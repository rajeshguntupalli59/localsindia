import base64
import hashlib
import hmac
import uuid
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.business import Business
from app.models.listing import Listing
from app.models.user import User

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])

RAZORPAY_API = "https://api.razorpay.com/v1"

# Pricing tiers — accept both "week"/"weekly" and "month"/"monthly" (mobile compat)
PLANS = {
    "week":    {"amount": 9900,  "label": "1 Week",  "days": 7},
    "weekly":  {"amount": 9900,  "label": "1 Week",  "days": 7},
    "month":   {"amount": 19900, "label": "1 Month", "days": 30},
    "monthly": {"amount": 19900, "label": "1 Month", "days": 30},
}


def _razorpay_auth() -> str:
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment gateway not configured.")
    token = base64.b64encode(
        f"{settings.RAZORPAY_KEY_ID}:{settings.RAZORPAY_KEY_SECRET}".encode()
    ).decode()
    return f"Basic {token}"


# ── Schemas ──────────────────────────────────────────────────────────────────

class CreateOrderRequest(BaseModel):
    listing_id: uuid.UUID
    plan: str


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    key_id: str
    listing_id: str
    plan: str


class VerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    listing_id: uuid.UUID
    plan: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/featured/create-order", response_model=CreateOrderResponse)
async def create_featured_order(
    body: CreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = PLANS.get(body.plan)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan. Choose 'week' or 'month'.")

    result = await db.execute(
        select(Listing).where(
            Listing.id == body.listing_id,
            Listing.deleted_at.is_(None),
        )
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    if listing.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your listing.")
    if listing.status != "active":
        raise HTTPException(status_code=400, detail="Only active listings can be featured.")

    auth = _razorpay_auth()
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{RAZORPAY_API}/orders",
                headers={"Authorization": auth, "Content-Type": "application/json"},
                json={
                    "amount": plan["amount"],
                    "currency": "INR",
                    "receipt": str(body.listing_id)[:40],
                    "notes": {
                        "listing_id": str(body.listing_id),
                        "plan": body.plan,
                        "user_id": str(current_user.id),
                    },
                },
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Razorpay error: {resp.text}")
        order = resp.json()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Payment gateway error: {exc}") from exc

    return CreateOrderResponse(
        order_id=order["id"],
        amount=plan["amount"],
        currency="INR",
        key_id=settings.RAZORPAY_KEY_ID,
        listing_id=str(body.listing_id),
        plan=body.plan,
    )


@router.post("/featured/verify")
async def verify_featured_payment(
    body: VerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expected = hmac.new(
        key=settings.RAZORPAY_KEY_SECRET.encode(),
        msg=f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        digestmod=hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment verification failed.")

    plan = PLANS.get(body.plan)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan.")

    result = await db.execute(
        select(Listing).where(
            Listing.id == body.listing_id,
            Listing.deleted_at.is_(None),
        )
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    if listing.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your listing.")

    listing.is_featured = True
    listing.featured_at = datetime.now(timezone.utc)
    listing.featured_until = datetime.now(timezone.utc) + timedelta(days=plan["days"])
    await db.commit()

    return {"success": True, "message": f"Listing featured for {plan['label']}!"}


# ── Business Verified Badge ───────────────────────────────────────────────────

BADGE_PLANS = {
    "monthly":   {"amount": 49900,  "label": "1 Month",  "days": 30},
    "quarterly": {"amount": 129900, "label": "3 Months", "days": 90},
}


class BadgeOrderRequest(BaseModel):
    business_id: uuid.UUID
    plan: str


class BadgeOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    key_id: str
    business_id: str
    plan: str


class BadgeVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    business_id: uuid.UUID
    plan: str


@router.post("/business-badge/create-order", response_model=BadgeOrderResponse)
async def create_badge_order(
    body: BadgeOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = BADGE_PLANS.get(body.plan)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan. Choose 'monthly' or 'quarterly'.")

    result = await db.execute(
        select(Business).where(Business.id == body.business_id, Business.deleted_at.is_(None))
    )
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found.")
    if business.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="You must be the business owner to get verified.")

    auth = _razorpay_auth()
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{RAZORPAY_API}/orders",
                headers={"Authorization": auth, "Content-Type": "application/json"},
                json={
                    "amount": plan["amount"],
                    "currency": "INR",
                    "receipt": str(body.business_id)[:40],
                    "notes": {
                        "business_id": str(body.business_id),
                        "plan": body.plan,
                        "user_id": str(current_user.id),
                        "type": "business_badge",
                    },
                },
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Razorpay error: {resp.text}")
        order = resp.json()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Payment gateway error: {exc}") from exc

    return BadgeOrderResponse(
        order_id=order["id"],
        amount=plan["amount"],
        currency="INR",
        key_id=settings.RAZORPAY_KEY_ID,
        business_id=str(body.business_id),
        plan=body.plan,
    )


@router.post("/business-badge/verify")
async def verify_badge_payment(
    body: BadgeVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expected = hmac.new(
        key=settings.RAZORPAY_KEY_SECRET.encode(),
        msg=f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        digestmod=hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment verification failed.")

    plan = BADGE_PLANS.get(body.plan)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan.")

    result = await db.execute(
        select(Business).where(Business.id == body.business_id, Business.deleted_at.is_(None))
    )
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found.")
    if business.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your business.")

    now = datetime.now(timezone.utc)
    # Extend from current expiry if badge is still active, else from now
    base = business.badge_expires_at if (business.badge_expires_at and business.badge_expires_at > now) else now
    business.verified = True
    business.badge_plan = body.plan
    business.badge_expires_at = base + timedelta(days=plan["days"])
    await db.commit()

    return {"success": True, "message": f"Verified badge active for {plan['label']}!", "expires_at": business.badge_expires_at.isoformat()}
