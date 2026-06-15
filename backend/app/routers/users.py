import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.listing import Listing
from app.models.user import User
from app.schemas.listing import ListingOut

router = APIRouter(prefix="/api/v1", tags=["users"])


class SellerProfileOut(BaseModel):
    id: uuid.UUID
    name: str | None
    avatar_url: str | None
    member_since: str
    active_listings_count: int
    listings: list[ListingOut]


@router.get("/users/{user_id}/public-profile", response_model=SellerProfileOut)
async def get_public_profile(user_id: str, db: AsyncSession = Depends(get_db)):
    # Try UUID lookup first, fall back to name-based lookup for dev/test slugs
    user = None
    try:
        uid = uuid.UUID(user_id)
        result = await db.execute(
            select(User).where(User.id == uid, User.is_active == True)
        )
        user = result.scalar_one_or_none()
    except ValueError:
        pass

    if user is None:
        # Fall back to case-insensitive name lookup (for dev/test users)
        result = await db.execute(
            select(User).where(
                User.name.ilike(user_id),
                User.is_active == True,
            )
        )
        user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    listings_result = await db.execute(
        select(Listing)
        .where(
            Listing.user_id == user.id,
            Listing.status == "active",
            Listing.deleted_at.is_(None),
            ~Listing.contact_phone.like("+91630000%"),
        )
        .order_by(Listing.is_featured.desc(), Listing.created_at.desc())
        .limit(12)
    )
    listings = listings_result.scalars().all()

    count_result = await db.execute(
        select(func.count()).select_from(Listing).where(
            Listing.user_id == user.id,
            Listing.status == "active",
            Listing.deleted_at.is_(None),
        )
    )
    active_count = count_result.scalar() or 0

    return SellerProfileOut(
        id=user.id,
        name=user.name,
        avatar_url=user.avatar_url,
        member_since=user.created_at.isoformat(),
        active_listings_count=active_count,
        listings=[ListingOut.model_validate(l) for l in listings],
    )
