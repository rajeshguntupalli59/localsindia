"""Claiming a directory business: SMS OTP to the business's own number, or
proof documents reviewed by an admin. Replaces the old first-come instant
claim, which let any signed-in user take over any business."""
import re
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_admin
from app.core.limiter import limiter
from app.core.security import generate_otp, hash_password, verify_password
from app.models.business import Business
from app.models.business_claim import BusinessClaim
from app.models.city import City
from app.models.user import User
from app.services import msg91
from app.services.cloudinary_svc import upload_private_image, private_image_url
from app.services.notification_svc import notify

router = APIRouter(prefix="/api/v1", tags=["business-claims"])

PHONE_RE = re.compile(r"^\+91[6-9]\d{9}$")
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_BYTES = 5 * 1024 * 1024
OTP_EXPIRE_MINUTES = 10
OTP_MAX_ATTEMPTS = 3
OTP_MAX_SENDS_PER_HOUR = 3   # per business — the SMS goes to someone else's phone

DOC_TYPES = {
    "gst": "GST registration certificate",
    "udyam": "Udyam / MSME certificate",
    "shop_establishment": "Shop & Establishment licence",
    "trade_licence": "Municipal trade licence",
    "fssai": "FSSAI licence / registration",
    "drug_licence": "Drug licence",
    "medical_registration": "Clinic / medical council registration",
    "institute_registration": "School / institute registration",
    "incorporation": "Company / LLP / partnership document",
    "business_pan": "PAN card in the business name",
    "electricity_bill": "Electricity bill for the business address",
    "phone_bill": "Landline / broadband bill in the business name",
    "bank_proof": "Current-account statement or cancelled cheque",
    "rent_agreement": "Shop rent agreement",
    "invoice": "Printed bill / invoice with the business name",
}


def normalize_indian_mobile(raw: str | None) -> str | None:
    """'+91 98480 22338', '098480-22338', '919848022338' → '+919848022338'.
    Returns None for landlines or anything that isn't an Indian mobile."""
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    candidate = f"+91{digits}"
    return candidate if PHONE_RE.match(candidate) else None


def mask_phone(phone: str) -> str:
    return f"{phone[:3]} ••••• {phone[-4:]}"


async def _get_business(business_id: uuid.UUID, db: AsyncSession) -> Business:
    result = await db.execute(
        select(Business).where(Business.id == business_id, Business.deleted_at.is_(None))
    )
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found.")
    return business


async def _pending_claim(db: AsyncSession, business_id: uuid.UUID, user_id: uuid.UUID) -> BusinessClaim | None:
    result = await db.execute(
        select(BusinessClaim).where(
            BusinessClaim.business_id == business_id,
            BusinessClaim.user_id == user_id,
            BusinessClaim.status == "pending",
        )
    )
    return result.scalar_one_or_none()


# ── Claimant endpoints ────────────────────────────────────────────────────────

@router.get("/businesses/{business_id}/claim-options")
async def claim_options(
    business_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_business(business_id, db)
    mobile = normalize_indian_mobile(business.phone)
    pending = await _pending_claim(db, business_id, current_user.id)
    return {
        "claimed": business.owner_id is not None,
        "is_owner": business.owner_id == current_user.id,
        # OTP only makes sense for an unclaimed business with a mobile number
        "otp_available": business.owner_id is None and mobile is not None,
        "masked_phone": mask_phone(mobile) if mobile else None,
        "pending_claim": bool(pending),
        "doc_types": [{"key": k, "label": v} for k, v in DOC_TYPES.items()],
    }


@router.post("/businesses/{business_id}/claim/otp/send")
@limiter.limit("3/minute")
async def send_claim_otp(
    request: Request,
    business_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_business(business_id, db)
    if business.owner_id is not None:
        raise HTTPException(status_code=409, detail="This business is already claimed. Use document verification instead.")
    mobile = normalize_indian_mobile(business.phone)
    if not mobile:
        raise HTTPException(status_code=400, detail="This business has no mobile number on file. Use document verification instead.")

    now = datetime.now(timezone.utc)
    sent_recently = await db.execute(
        select(func.count()).select_from(BusinessClaim).where(
            BusinessClaim.business_id == business_id,
            BusinessClaim.method == "otp",
            BusinessClaim.created_at >= now - timedelta(hours=1),
        )
    )
    if sent_recently.scalar() >= OTP_MAX_SENDS_PER_HOUR:
        raise HTTPException(status_code=429, detail="Too many codes sent to this business. Try again in an hour.")

    otp = generate_otp()
    db.add(BusinessClaim(
        business_id=business_id,
        user_id=current_user.id,
        method="otp",
        status="otp_sent",
        otp_hash=hash_password(otp),
        otp_expires_at=now + timedelta(minutes=OTP_EXPIRE_MINUTES),
    ))
    await db.commit()

    if settings.OTP_DEBUG:
        return {"message": "OTP sent", "masked_phone": mask_phone(mobile), "otp": otp}

    sent, data = await msg91.send_otp(mobile, otp)
    if not sent:
        raise HTTPException(status_code=502, detail="Could not send the SMS. Try document verification instead.")
    return {"message": "OTP sent", "masked_phone": mask_phone(mobile)}


class ClaimOtpVerify(BaseModel):
    otp: str


@router.post("/businesses/{business_id}/claim/otp/verify")
@limiter.limit("10/minute")
async def verify_claim_otp(
    request: Request,
    business_id: uuid.UUID,
    body: ClaimOtpVerify,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_business(business_id, db)
    if business.owner_id is not None:
        raise HTTPException(status_code=409, detail="This business is already claimed.")

    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(BusinessClaim)
        .where(
            BusinessClaim.business_id == business_id,
            BusinessClaim.user_id == current_user.id,
            BusinessClaim.method == "otp",
            BusinessClaim.status == "otp_sent",
            BusinessClaim.otp_expires_at > now,
        )
        .order_by(BusinessClaim.created_at.desc())
        .limit(1)
    )
    claim = result.scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=400, detail="Code expired or not found. Request a new one.")

    claim.otp_attempts += 1
    if claim.otp_attempts > OTP_MAX_ATTEMPTS:
        claim.status = "expired"
        await db.commit()
        raise HTTPException(status_code=429, detail="Too many wrong codes. Request a new one.")
    if not verify_password(body.otp, claim.otp_hash):
        await db.commit()
        raise HTTPException(status_code=400, detail="Wrong code.")

    claim.status = "approved"
    claim.reviewed_at = now
    business.owner_id = current_user.id
    business.updated_at = now
    await db.commit()
    return {"status": "approved"}


async def _read_image(file: UploadFile, label: str) -> bytes:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"{label}: only JPEG, PNG or WebP photos are allowed.")
    data = await file.read()
    if len(data) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail=f"{label}: must be under 5 MB.")
    return data


@router.post("/businesses/{business_id}/claim/documents", status_code=201)
@limiter.limit("5/hour")
async def submit_claim_documents(
    request: Request,
    business_id: uuid.UUID,
    doc_type: str = Form(...),
    contact_phone: str = Form(...),
    note: str | None = Form(default=None),
    document: UploadFile = File(...),
    shop_photo: UploadFile = File(...),
    visiting_card: UploadFile | None = File(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    business = await _get_business(business_id, db)
    if business.owner_id == current_user.id:
        raise HTTPException(status_code=409, detail="You already own this business.")
    if doc_type not in DOC_TYPES:
        raise HTTPException(status_code=400, detail="Choose a document type from the list.")
    phone = normalize_indian_mobile(contact_phone)
    if not phone:
        raise HTTPException(status_code=400, detail="Enter a valid Indian mobile number we can call you on.")
    if await _pending_claim(db, business_id, current_user.id):
        raise HTTPException(status_code=409, detail="You already have a claim under review for this business.")

    doc_bytes = await _read_image(document, "Document")
    photo_bytes = await _read_image(shop_photo, "Shop photo")
    card_bytes = await _read_image(visiting_card, "Visiting card") if visiting_card and visiting_card.filename else None

    claim = BusinessClaim(
        business_id=business_id,
        user_id=current_user.id,
        method="documents",
        status="pending",
        contact_phone=phone,
        doc_type=doc_type,
        note=(note or "").strip()[:500] or None,
        document_id=await upload_private_image(doc_bytes, document.filename or "document"),
        shop_photo_id=await upload_private_image(photo_bytes, shop_photo.filename or "shop"),
        visiting_card_id=await upload_private_image(card_bytes, visiting_card.filename or "card") if card_bytes else None,
    )
    db.add(claim)
    await db.commit()
    return {"status": "pending", "id": str(claim.id)}


# ── Admin review ──────────────────────────────────────────────────────────────

@router.get("/admin/business-claims")
async def list_claims(
    status: str = "pending",
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(BusinessClaim, Business, City, User)
        .join(Business, Business.id == BusinessClaim.business_id)
        .join(City, City.id == Business.city_id)
        .join(User, User.id == BusinessClaim.user_id)
        .where(BusinessClaim.method == "documents", BusinessClaim.status == status)
        .order_by(BusinessClaim.created_at.asc())
        .limit(100)
    )
    return [
        {
            "id": str(c.id),
            "status": c.status,
            "created_at": c.created_at,
            "business": {
                "id": str(b.id), "name": b.name, "address": b.address, "phone": b.phone,
                "city_slug": city.slug, "already_claimed": b.owner_id is not None,
            },
            "claimant": {"id": str(u.id), "name": u.name, "phone": u.phone},
            "contact_phone": c.contact_phone,
            "doc_type": c.doc_type,
            "doc_label": DOC_TYPES.get(c.doc_type or "", c.doc_type),
            "note": c.note,
            "document_url": private_image_url(c.document_id),
            "shop_photo_url": private_image_url(c.shop_photo_id),
            "visiting_card_url": private_image_url(c.visiting_card_id),
            "reject_reason": c.reject_reason,
        }
        for c, b, city, u in result.all()
    ]


async def _get_pending(claim_id: uuid.UUID, db: AsyncSession) -> BusinessClaim:
    claim = (await db.execute(select(BusinessClaim).where(BusinessClaim.id == claim_id))).scalar_one_or_none()
    if not claim or claim.method != "documents":
        raise HTTPException(status_code=404, detail="Claim not found.")
    if claim.status != "pending":
        raise HTTPException(status_code=409, detail=f"Claim is already {claim.status}.")
    return claim


@router.post("/admin/business-claims/{claim_id}/approve")
async def approve_claim(
    claim_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    claim = await _get_pending(claim_id, db)
    business = await _get_business(claim.business_id, db)
    now = datetime.now(timezone.utc)

    claim.status = "approved"
    claim.reviewed_by = admin.id
    claim.reviewed_at = now
    # Approval overrides any earlier owner — this is how a wrong claim gets fixed
    business.owner_id = claim.user_id
    business.updated_at = now

    # Other pending claims for the same business lose
    others = await db.execute(
        select(BusinessClaim).where(
            BusinessClaim.business_id == business.id,
            BusinessClaim.status == "pending",
            BusinessClaim.id != claim.id,
        )
    )
    losers = others.scalars().all()
    for other in losers:
        other.status = "rejected"
        other.reject_reason = "Another owner's claim was verified for this business."
        other.reviewed_by = admin.id
        other.reviewed_at = now
    await db.commit()

    await notify(
        db, claim.user_id, "business_claim",
        f"You now manage {business.name}",
        "Your ownership claim was verified. You can edit the listing now.",
        action_url=f"/{(await db.get(City, business.city_id)).slug}/businesses/{business.id}",
    )
    for other in losers:
        await notify(db, other.user_id, "business_claim", f"Claim for {business.name} not approved", other.reject_reason)
    return {"status": "approved"}


class EmailClaimApprove(BaseModel):
    business_id: uuid.UUID
    phone: str               # the claimant's LocalsIndia account phone, from their email
    note: str | None = None  # e.g. what they attached


@router.post("/admin/business-claims/email")
async def approve_email_claim(
    body: EmailClaimApprove,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Owner sent proof by email instead of uploading — admin checked it and
    grants ownership here. The claimant needs an account (they sign up with
    OTP first) so there's a user to make the owner."""
    phone = normalize_indian_mobile(body.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="Enter the claimant's 10-digit account mobile number.")
    user = (await db.execute(
        select(User).where(User.phone == phone, User.deleted_at.is_(None))
    )).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="No LocalsIndia account with that number. Ask them to sign up first.")
    business = await _get_business(body.business_id, db)
    now = datetime.now(timezone.utc)

    db.add(BusinessClaim(
        business_id=business.id,
        user_id=user.id,
        method="email",
        status="approved",
        contact_phone=phone,
        note=(body.note or "").strip()[:500] or None,
        reviewed_by=admin.id,
        reviewed_at=now,
    ))
    business.owner_id = user.id
    business.updated_at = now
    await db.commit()

    city = await db.get(City, business.city_id)
    await notify(
        db, user.id, "business_claim",
        f"You now manage {business.name}",
        "We checked the documents you emailed. You can edit the listing now.",
        action_url=f"/{city.slug}/businesses/{business.id}",
    )
    return {"status": "approved", "business": business.name, "owner": user.name}


class RejectBody(BaseModel):
    reason: str


@router.post("/admin/business-claims/{claim_id}/reject")
async def reject_claim(
    claim_id: uuid.UUID,
    body: RejectBody,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    reason = body.reason.strip()
    if not reason:
        raise HTTPException(status_code=400, detail="Give a reason — the claimant will see it.")
    claim = await _get_pending(claim_id, db)
    business = await _get_business(claim.business_id, db)
    claim.status = "rejected"
    claim.reject_reason = reason[:500]
    claim.reviewed_by = admin.id
    claim.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    await notify(db, claim.user_id, "business_claim", f"Claim for {business.name} not approved", claim.reject_reason)
    return {"status": "rejected"}
