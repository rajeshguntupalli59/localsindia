import hashlib
import hmac
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.listing import Listing
from app.models.user import User

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])

# Pricing tiers — accept both "week"/"weekly" and "month"/"monthly" (mobile compat)
PLANS = {
    "week":    {"amount": 9900,  "label": "1 Week",  "days": 7},   # Rs.99 in paise
    "weekly":  {"amount": 9900,  "label": "1 Week",  "days": 7},
    "month":   {"amount": 19900, "label": "1 Month", "days": 30},  # Rs.199 in paise
    "monthly": {"amount": 19900, "label": "1 Month", "days": 30},
}


def _razorpay_client():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment gateway not configured.")
    import razorpay  # noqa: PLC0415 — lazy import keeps startup free of setuptools dependency
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


# ── Schemas ──────────────────────────────────────────────────────────────────

class CreateOrderRequest(BaseModel):
    listing_id: uuid.UUID
    plan: str  # "week" | "month"


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int       # paise
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

    # Verify the listing belongs to this user
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

    client = _razorpay_client()
    order = client.order.create({
        "amount": plan["amount"],
        "currency": "INR",
        "receipt": str(body.listing_id)[:40],
        "notes": {
            "listing_id": str(body.listing_id),
            "plan": body.plan,
            "user_id": str(current_user.id),
        },
    })

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
    # Verify HMAC signature
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
    listing.expires_at = datetime.now(timezone.utc) + timedelta(days=plan["days"])
    await db.commit()

    return {"success": True, "message": f"Listing featured for {plan['label']}!"}
