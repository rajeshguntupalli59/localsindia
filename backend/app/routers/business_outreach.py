"""Admin outreach queue: invite directory businesses to claim their free listing,
JustDial-style — the admin calls, WhatsApps or emails each one themselves, one at a
time (no bulk or automated messaging), and logs the outcome here."""
import hashlib
import hmac
import html
import re
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, func, case, literal
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.business import Business
from app.models.business_outreach import BusinessOutreach
from app.models.category import Category
from app.models.city import City
from app.models.user import User
from app.core.category_catalog import subcategory_entry
from app.core.pagination import MAX_PAGE_SIZE
from app.routers.business_claims import normalize_indian_mobile
from app.services.email_svc import send_claim_invite_email

router = APIRouter(prefix="/api/v1/admin/outreach", tags=["business-outreach"])
public_router = APIRouter(prefix="/api/v1/outreach", tags=["business-outreach"])

FOLLOW_UP = ("whatsapp_sent", "email_sent", "no_answer", "callback", "interested")
CLOSED = ("not_interested", "wrong_number")
OUTCOMES = FOLLOW_UP + CLOSED
STATUSES = ("todo", "follow_up", "closed", "claimed")
PAGE_SIZE = 25
EMAIL_COOLDOWN = timedelta(days=30)
UNSUBSCRIBED = "Unsubscribed via email link"
DAILY_AUTO_INVITES = 100  # GoDaddy mailbox caps ~250-500/day; site mail needs room too
SITE = "https://www.localsindia.com"
# Public API host for the unsubscribe link (BACKEND_URL isn't set on Azure; same fallback as the frontend)
PUBLIC_API = "https://localsindia-backend-in.azurewebsites.net"
_EMAIL_RE = re.compile(r"^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$")


def clean_email(raw: str | None) -> str | None:
    """First valid address in raw (OSM tags may hold several, or a mailto:), lowercased."""
    for part in re.split(r"[;,\s]+", raw or ""):
        part = part.strip().lower().removeprefix("mailto:")
        if len(part) <= 254 and _EMAIL_RE.match(part):
            return part
    return None


def unsubscribe_token(business_id: uuid.UUID) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), f"outreach-unsub:{business_id}".encode(),
                    hashlib.sha256).hexdigest()[:32]


class EmailUpdate(BaseModel):
    email: str | None = Field(default=None, max_length=254)


class OutreachLog(BaseModel):
    outcome: str
    note: str | None = Field(default=None, max_length=500)


def _latest_outreach():
    """Latest outreach row per business, plus how many attempts so far."""
    ranked = select(
        BusinessOutreach.business_id,
        BusinessOutreach.outcome,
        BusinessOutreach.note,
        BusinessOutreach.created_at,
        func.row_number().over(
            partition_by=BusinessOutreach.business_id, order_by=BusinessOutreach.created_at.desc()
        ).label("rn"),
        func.count().over(partition_by=BusinessOutreach.business_id).label("attempts"),
    ).subquery()
    return select(ranked).where(ranked.c.rn == 1).subquery()


@router.get("")
async def outreach_queue(
    city_slug: str | None = None,
    category_slug: str | None = None,
    status: str = "todo",
    page: int = 1,
    page_size: int = PAGE_SIZE,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if status not in STATUSES:
        raise HTTPException(status_code=422, detail=f"status must be one of {', '.join(STATUSES)}")
    page_size = max(1, min(page_size, MAX_PAGE_SIZE))
    latest = _latest_outreach()
    bucket = case(
        (Business.owner_id.is_not(None), case((latest.c.outcome.is_not(None), "claimed"), else_=literal(None))),
        (latest.c.outcome.is_(None), "todo"),
        (latest.c.outcome.in_(CLOSED), "closed"),
        else_="follow_up",
    ).label("bucket")
    is_mobile = func.regexp_replace(Business.phone, r"\D", "", "g").op("~")(r"^(91|0)?[6-9][0-9]{9}$")
    # Same email on several listings = chain head office or duplicate listing; one invite per address
    shared = (
        select(Business.email, func.count().label("n"))
        .where(Business.email.is_not(None), Business.deleted_at.is_(None))
        .group_by(Business.email).subquery()
    )

    base = (
        select(Business, City, Category, latest.c.outcome, latest.c.note, latest.c.created_at, latest.c.attempts,
               shared.c.n, bucket)
        .join(City, City.id == Business.city_id)
        .outerjoin(shared, shared.c.email == Business.email)
        .outerjoin(Category, Category.id == Business.category_id)
        .outerjoin(latest, latest.c.business_id == Business.id)
        .where(Business.deleted_at.is_(None),
               ((Business.phone.is_not(None)) & (Business.phone != "")) | Business.email.is_not(None))
    )
    if city_slug:
        base = base.where(City.slug == city_slug)
    if category_slug:
        base = base.where(Category.slug == category_slug)

    counted = base.subquery()
    counts = {s: 0 for s in STATUSES}
    for b, n in (await db.execute(select(counted.c.bucket, func.count()).group_by(counted.c.bucket))).all():
        if b in counts:
            counts[b] = n

    # Mobiles first (WhatsApp + SMS-claimable); follow-ups oldest contact first
    order = [is_mobile.desc(), latest.c.created_at.asc()] if status == "follow_up" else [is_mobile.desc(), Business.name]
    rows = (await db.execute(
        base.where(bucket == status).order_by(*order).limit(page_size).offset((max(page, 1) - 1) * page_size)
    )).all()

    return {
        "counts": counts,
        "items": [
            {
                "id": str(b.id),
                "name": b.name,
                "address": b.address,
                "phone": b.phone,
                "mobile": normalize_indian_mobile(b.phone) if b.phone else None,
                "email": b.email,
                "email_shared_with": max((shared_n or 1) - 1, 0),
                "city_slug": city.slug,
                "city_name": city.name,
                "category_name": cat.name if cat else None,
                # Type (e.g. Dentists) — the outreach message links its /{city}/{type} page
                "subcategory_slug": b.subcategory_slug,
                "subcategory_name": (subcategory_entry(b.subcategory_slug) or (None, {}))[1].get("name"),
                "last_outcome": outcome,
                "last_note": note,
                "last_contacted_at": contacted_at,
                "attempts": attempts or 0,
            }
            for b, city, cat, outcome, note, contacted_at, attempts, shared_n, _ in rows
        ],
    }


@router.post("/{business_id}", status_code=201)
async def log_outreach(
    business_id: uuid.UUID,
    body: OutreachLog,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if body.outcome not in OUTCOMES:
        raise HTTPException(status_code=422, detail=f"outcome must be one of {', '.join(OUTCOMES)}")
    business = (await db.execute(
        select(Business).where(Business.id == business_id, Business.deleted_at.is_(None))
    )).scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    db.add(BusinessOutreach(
        business_id=business.id, admin_id=admin.id, outcome=body.outcome,
        note=(body.note or "").strip() or None,
    ))
    await db.commit()
    return {"ok": True, "status": "closed" if body.outcome in CLOSED else "follow_up"}


async def _live_business(db: AsyncSession, business_id: uuid.UUID) -> Business:
    business = (await db.execute(
        select(Business).where(Business.id == business_id, Business.deleted_at.is_(None))
    )).scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business


@router.put("/{business_id}/email")
async def set_outreach_email(
    business_id: uuid.UUID,
    body: EmailUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Admin types in an owner email (e.g. found on the business's website); empty clears it."""
    business = await _live_business(db, business_id)
    typed = (body.email or "").strip()
    email = clean_email(typed) if typed else None
    if typed and not email:
        raise HTTPException(status_code=422, detail="That doesn't look like a valid email address")
    business.email = email
    await db.commit()
    return {"email": email}


@router.post("/{business_id}/send-email", status_code=201)
async def send_outreach_email(
    business_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Send ONE claim invite to this business's email, then log it as an outreach attempt."""
    business = await _live_business(db, business_id)
    err = await _send_invite(db, business, admin.id)
    if err:
        raise HTTPException(status_code=err[0], detail=err[1])
    return {"ok": True, "status": "follow_up"}


async def _send_invite(db: AsyncSession, business: Business, admin_id) -> tuple[int, str] | None:
    """Every guard + the send + the log row. Returns (http_status, reason) when not sent."""
    if not business.email:
        return 400, "This business has no email address"
    if business.owner_id:
        return 409, "Already claimed"
    latest = (await db.execute(
        select(BusinessOutreach.outcome).where(BusinessOutreach.business_id == business.id)
        .order_by(BusinessOutreach.created_at.desc()).limit(1)
    )).scalar_one_or_none()
    if latest in CLOSED:
        return 409, "Closed (not interested / wrong number / unsubscribed) — not emailing"
    same_address = select(Business.id).where(Business.email == business.email)
    if (await db.execute(
        select(BusinessOutreach.id).where(BusinessOutreach.business_id.in_(same_address),
                                          BusinessOutreach.note == UNSUBSCRIBED).limit(1)
    )).first():
        return 409, "This email address unsubscribed — not emailing"
    last_email = (await db.execute(
        select(func.max(BusinessOutreach.created_at))
        .where(BusinessOutreach.business_id.in_(same_address), BusinessOutreach.outcome == "email_sent")
    )).scalar_one_or_none()
    if last_email and datetime.now(timezone.utc) - last_email < EMAIL_COOLDOWN:
        return 429, "This email address was already sent an invite in the last 30 days"

    city = (await db.execute(select(City).where(City.id == business.city_id))).scalar_one()
    unsub = (f"{PUBLIC_API}/api/v1/outreach/unsubscribe"
             f"?b={business.id}&t={unsubscribe_token(business.id)}")
    ok = await send_claim_invite_email(
        to=business.email, business_name=business.name, city_name=city.name,
        business_url=f"{SITE}/{city.slug}/businesses/{business.id}?claim=1", unsubscribe_url=unsub,
    )
    if not ok:
        return 502, "Email provider rejected the message — try again later"
    who = "Claim email" if admin_id else "Auto claim email"
    db.add(BusinessOutreach(business_id=business.id, admin_id=admin_id, outcome="email_sent",
                            note=f"{who} to {business.email}"))
    await db.commit()
    return None


async def send_daily_invites(db: AsyncSession, limit: int) -> dict:
    """Automatic invites (admin_id NULL): each address at most ONCE, ever. Skips claimed
    businesses, closed/unsubscribed ones, addresses shared with a claimed business, and
    businesses with a claim under review. Hyderabad first. Capped at DAILY_AUTO_INVITES/day."""
    import asyncio
    sent_today = await _sent_today(db, auto_only=True)
    limit = max(0, min(limit, DAILY_AUTO_INVITES - sent_today))
    queue = await _invite_queue(db)

    sent, failed, streak = 0, 0, 0
    for b in queue[:limit]:
        err = await _send_invite(db, b, None)
        if err is None:
            sent, streak = sent + 1, 0
        else:
            failed, streak = failed + 1, streak + 1
            if streak >= 3:   # mailbox refusing (daily cap / password) - stop, retry tomorrow
                break
        await asyncio.sleep(1)
    return {"sent": sent, "failed": failed, "sent_today": sent_today + sent,
            "addresses_left": len(queue) - sent}


async def _sent_today(db: AsyncSession, auto_only: bool) -> int:
    day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    q = select(func.count()).select_from(BusinessOutreach).where(
        BusinessOutreach.outcome == "email_sent", BusinessOutreach.created_at >= day_start)
    if auto_only:
        q = q.where(BusinessOutreach.admin_id.is_(None))
    return (await db.execute(q)).scalar_one()


async def _invite_queue(db: AsyncSession) -> list[Business]:
    """Businesses still due their one automatic invite — one per address, Hyderabad first."""
    from app.models.business_claim import BusinessClaim
    touched = (select(Business.email)
               .join(BusinessOutreach, BusinessOutreach.business_id == Business.id)
               .where(Business.email.is_not(None),
                      (BusinessOutreach.outcome.in_(("email_sent",) + CLOSED))
                      | (BusinessOutreach.note == UNSUBSCRIBED)))
    claimed = select(Business.email).where(Business.email.is_not(None), Business.owner_id.is_not(None))
    under_review = select(BusinessClaim.business_id).where(BusinessClaim.status == "pending")
    rows = (await db.execute(
        select(Business).join(City, City.id == Business.city_id)
        .where(Business.email.is_not(None), Business.deleted_at.is_(None), Business.owner_id.is_(None),
               Business.email.not_in(touched), Business.email.not_in(claimed),
               Business.id.not_in(under_review))
        .order_by(case((City.slug == "hyderabad", 0), else_=1), City.name, Business.created_at)
    )).scalars().all()
    queue, seen = [], set()
    for b in rows:
        if b.email not in seen:
            seen.add(b.email)
            queue.append(b)
    return queue


@router.get("/email-progress")
async def email_progress(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Where the claim-email campaign is at, for the summary on /admin/outreach."""
    sent_rows = select(BusinessOutreach.business_id).where(BusinessOutreach.outcome == "email_sent")
    total, last = (await db.execute(
        select(func.count(), func.max(BusinessOutreach.created_at)).where(BusinessOutreach.outcome == "email_sent")
    )).one()
    claimed = (await db.execute(
        select(func.count()).select_from(Business)
        .where(Business.id.in_(sent_rows), Business.owner_id.is_not(None))
    )).scalar_one()
    unsubscribed = (await db.execute(
        select(func.count()).select_from(BusinessOutreach).where(BusinessOutreach.note == UNSUBSCRIBED)
    )).scalar_one()
    return {
        "sent_total": total,
        "sent_today": await _sent_today(db, auto_only=False),
        "auto_sent_today": await _sent_today(db, auto_only=True),
        "daily_limit": DAILY_AUTO_INVITES,
        "addresses_left": len(await _invite_queue(db)),
        "claimed_after_email": claimed,
        "unsubscribed": unsubscribed,
        "last_sent_at": last,
    }


@public_router.get("/unsubscribe", response_class=HTMLResponse)
async def unsubscribe(b: uuid.UUID, t: str, db: AsyncSession = Depends(get_db)):
    """One-click opt-out from the claim email: closes the business in the outreach queue."""
    if not hmac.compare_digest(t, unsubscribe_token(b)):
        raise HTTPException(status_code=400, detail="Invalid unsubscribe link")
    business = await _live_business(db, b)
    latest = (await db.execute(
        select(BusinessOutreach.outcome).where(BusinessOutreach.business_id == b)
        .order_by(BusinessOutreach.created_at.desc()).limit(1)
    )).scalar_one_or_none()
    if latest not in CLOSED:
        db.add(BusinessOutreach(business_id=b, admin_id=None, outcome="not_interested", note=UNSUBSCRIBED))
        await db.commit()
    name = html.escape(business.name)
    return HTMLResponse(
        "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'>"
        "<title>Unsubscribed</title><body style='font-family:sans-serif;max-width:480px;margin:60px auto;padding:0 16px'>"
        f"<h2>You're unsubscribed</h2><p>We won't email {name} about LocalsIndia again.</p>"
        f"<p><a href='{SITE}'>localsindia.com</a></p></body>"
    )
