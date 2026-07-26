import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.buyer_request import BuyerRequest
from app.models.buyer_request_report import BuyerRequestReport
from app.models.category import Category
from app.models.city import City
from app.models.user import User
from app.schemas.buyer_request import BuyerRequestCreate, BuyerRequestOut
from app.schemas.listing import ReportCreate

router = APIRouter(prefix="/api/v1/buyer-requests", tags=["buyer-requests"])

# BL-04-equivalent for buyer requests: 3 reports → flagged, hidden from the
# public city feed — mirrors REPORT_FLAG_THRESHOLD in routers/listings.py.
REPORT_FLAG_THRESHOLD = 3


def _with_category(req: BuyerRequest, cat: Category | None) -> BuyerRequestOut:
    out = BuyerRequestOut.model_validate(req)
    if cat:
        out.category_name = cat.name
        out.category_slug = cat.slug
        out.category_icon = cat.icon
    return out


async def _get_own_request(request_id: uuid.UUID, current_user: User, db: AsyncSession) -> BuyerRequest:
    result = await db.execute(
        select(BuyerRequest).where(BuyerRequest.id == request_id, BuyerRequest.deleted_at.is_(None))
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    if req.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorised.")
    return req


@router.get("/cities/{slug}", response_model=list[BuyerRequestOut])
async def list_buyer_requests(slug: str, db: AsyncSession = Depends(get_db)):
    city_result = await db.execute(select(City).where(City.slug == slug, City.active == True))
    city = city_result.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found.")

    result = await db.execute(
        select(BuyerRequest)
        .where(
            BuyerRequest.city_id == city.id,
            BuyerRequest.status == "open",
            BuyerRequest.deleted_at.is_(None),
        )
        .order_by(BuyerRequest.created_at.desc())
        .limit(20)
    )
    requests = result.scalars().all()

    cat_ids = {r.category_id for r in requests if r.category_id}
    cat_map: dict[uuid.UUID, Category] = {}
    if cat_ids:
        cat_result = await db.execute(select(Category).where(Category.id.in_(cat_ids)))
        cat_map = {c.id: c for c in cat_result.scalars().all()}

    return [_with_category(r, cat_map.get(r.category_id)) for r in requests]


@router.post("", response_model=BuyerRequestOut, status_code=201)
async def create_buyer_request(
    body: BuyerRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    city_result = await db.execute(
        select(City).where(City.slug == body.city_slug.lower(), City.active == True)
    )
    city = city_result.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail=f"City '{body.city_slug}' not found.")

    cat_result = await db.execute(select(Category).where(Category.slug == body.category_slug.lower()))
    cat = cat_result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail=f"Category '{body.category_slug}' not found.")

    req = BuyerRequest(
        city_id=city.id,
        user_id=current_user.id,
        category_id=cat.id,
        description=body.description,
        budget=body.budget,
        contact_phone=body.contact_phone,
        status="open",
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return _with_category(req, cat)


@router.post("/{request_id}/report", status_code=201)
async def report_buyer_request(
    request_id: uuid.UUID,
    body: ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BuyerRequest).where(BuyerRequest.id == request_id, BuyerRequest.deleted_at.is_(None))
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")

    existing = await db.execute(
        select(BuyerRequestReport).where(
            BuyerRequestReport.buyer_request_id == request_id,
            BuyerRequestReport.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already reported.")

    db.add(BuyerRequestReport(
        buyer_request_id=request_id,
        user_id=current_user.id,
        reason=body.reason,
        notes=body.notes,
    ))

    req.report_count += 1
    if req.report_count >= REPORT_FLAG_THRESHOLD:
        req.status = "flagged"

    await db.commit()
    return {"message": "Report submitted."}


@router.patch("/{request_id}/fulfill", response_model=BuyerRequestOut)
async def fulfill_buyer_request(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = await _get_own_request(request_id, current_user, db)
    req.status = "fulfilled"
    await db.commit()
    await db.refresh(req)
    cat_result = await db.execute(select(Category).where(Category.id == req.category_id))
    return _with_category(req, cat_result.scalar_one_or_none())


@router.delete("/{request_id}", status_code=204)
async def delete_buyer_request(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = await _get_own_request(request_id, current_user, db)
    req.deleted_at = datetime.now(timezone.utc)
    await db.commit()
