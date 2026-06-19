import re
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import get_current_user
from app.models.buyer_request import BuyerRequest
from app.models.city import City
from app.models.category import Category
from app.models.user import User

PHONE_RE = re.compile(r"^\+91[6-9]\d{9}$")

router = APIRouter(prefix="/api/v1/buyer-requests", tags=["buyer-requests"])


class BuyerRequestCreate(BaseModel):
    city_slug: str
    category_slug: str
    description: str
    budget: float | None = None
    contact_phone: str

    @field_validator("contact_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not PHONE_RE.match(v):
            raise ValueError("Enter a valid Indian mobile number (+91XXXXXXXXXX)")
        return v

    @field_validator("description")
    @classmethod
    def validate_desc(cls, v: str) -> str:
        if len(v.strip()) < 10:
            raise ValueError("Describe what you're looking for (min 10 chars)")
        return v.strip()


class BuyerRequestOut(BaseModel):
    id: uuid.UUID
    description: str
    budget: float | None
    contact_phone: str
    status: str
    created_at: datetime
    city_id: uuid.UUID
    category_id: uuid.UUID
    user_id: uuid.UUID
    category_name: str | None = None
    category_slug: str | None = None
    category_icon: str | None = None

    model_config = {"from_attributes": True}


@router.get("/cities/{city_slug}", response_model=list[BuyerRequestOut])
async def list_buyer_requests(city_slug: str, db: AsyncSession = Depends(get_db)):
    city = (await db.execute(select(City).where(City.slug == city_slug, City.active == True))).scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    now = datetime.now(timezone.utc)
    rows = await db.execute(
        select(BuyerRequest, Category.name, Category.slug, Category.icon)
        .join(Category, BuyerRequest.category_id == Category.id)
        .where(
            BuyerRequest.city_id == city.id,
            BuyerRequest.status == "active",
            BuyerRequest.deleted_at.is_(None),
            BuyerRequest.expires_at > now,
        )
        .order_by(BuyerRequest.created_at.desc())
        .limit(20)
    )

    results = []
    for br, cat_name, cat_slug, cat_icon in rows:
        out = BuyerRequestOut.model_validate(br)
        out.category_name = cat_name
        out.category_slug = cat_slug
        out.category_icon = cat_icon
        results.append(out)
    return results


@router.post("", response_model=BuyerRequestOut, status_code=201)
@limiter.limit("5/minute")
async def create_buyer_request(
    request: Request,
    body: BuyerRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    city = (await db.execute(select(City).where(City.slug == body.city_slug, City.active == True))).scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    category = (await db.execute(select(Category).where(Category.slug == body.category_slug))).scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    br = BuyerRequest(
        user_id=current_user.id,
        city_id=city.id,
        category_id=category.id,
        description=body.description,
        budget=body.budget,
        contact_phone=body.contact_phone,
    )
    db.add(br)
    await db.commit()
    await db.refresh(br)

    out = BuyerRequestOut.model_validate(br)
    out.category_name = category.name
    out.category_slug = category.slug
    out.category_icon = category.icon
    return out


@router.patch("/{br_id}/fulfill", response_model=BuyerRequestOut)
async def fulfill_buyer_request(
    br_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    br = (await db.execute(select(BuyerRequest).where(BuyerRequest.id == br_id))).scalar_one_or_none()
    if not br or br.deleted_at:
        raise HTTPException(status_code=404, detail="Request not found")
    if br.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your request")
    br.status = "fulfilled"
    await db.commit()
    await db.refresh(br)
    return br


@router.delete("/{br_id}", status_code=204)
async def delete_buyer_request(
    br_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    br = (await db.execute(select(BuyerRequest).where(BuyerRequest.id == br_id))).scalar_one_or_none()
    if not br or br.deleted_at:
        raise HTTPException(status_code=404, detail="Request not found")
    if br.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your request")
    br.deleted_at = datetime.now(timezone.utc)
    await db.commit()
