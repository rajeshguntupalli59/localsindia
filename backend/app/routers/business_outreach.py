"""Admin outreach queue: invite directory businesses to claim their free listing,
JustDial-style — the admin calls or WhatsApps each one themselves (no bulk or
automated messaging) and logs the outcome here."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func, case, literal
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.business import Business
from app.models.business_outreach import BusinessOutreach
from app.models.category import Category
from app.models.city import City
from app.models.user import User
from app.routers.business_claims import normalize_indian_mobile

router = APIRouter(prefix="/api/v1/admin/outreach", tags=["business-outreach"])

FOLLOW_UP = ("whatsapp_sent", "no_answer", "callback", "interested")
CLOSED = ("not_interested", "wrong_number")
OUTCOMES = FOLLOW_UP + CLOSED
STATUSES = ("todo", "follow_up", "closed", "claimed")
PAGE_SIZE = 25


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
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if status not in STATUSES:
        raise HTTPException(status_code=422, detail=f"status must be one of {', '.join(STATUSES)}")
    latest = _latest_outreach()
    bucket = case(
        (Business.owner_id.is_not(None), case((latest.c.outcome.is_not(None), "claimed"), else_=literal(None))),
        (latest.c.outcome.is_(None), "todo"),
        (latest.c.outcome.in_(CLOSED), "closed"),
        else_="follow_up",
    ).label("bucket")
    is_mobile = func.regexp_replace(Business.phone, r"\D", "", "g").op("~")(r"^(91|0)?[6-9][0-9]{9}$")

    base = (
        select(Business, City, Category, latest.c.outcome, latest.c.note, latest.c.created_at, latest.c.attempts, bucket)
        .join(City, City.id == Business.city_id)
        .outerjoin(Category, Category.id == Business.category_id)
        .outerjoin(latest, latest.c.business_id == Business.id)
        .where(Business.deleted_at.is_(None), Business.phone.is_not(None), Business.phone != "")
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
        base.where(bucket == status).order_by(*order).limit(PAGE_SIZE).offset((max(page, 1) - 1) * PAGE_SIZE)
    )).all()

    return {
        "counts": counts,
        "items": [
            {
                "id": str(b.id),
                "name": b.name,
                "address": b.address,
                "phone": b.phone,
                "mobile": normalize_indian_mobile(b.phone),
                "city_slug": city.slug,
                "city_name": city.name,
                "category_name": cat.name if cat else None,
                "last_outcome": outcome,
                "last_note": note,
                "last_contacted_at": contacted_at,
                "attempts": attempts or 0,
            }
            for b, city, cat, outcome, note, contacted_at, attempts, _ in rows
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
