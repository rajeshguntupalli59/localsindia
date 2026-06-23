import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.saved_listing import SavedListing
from app.models.listing import Listing
from app.models.user import User
from app.schemas.listing import ListingOut
from app.models.category import Category

router = APIRouter(prefix="/api/v1/favorites", tags=["favorites"])


@router.post("/{listing_id}", status_code=200)
async def toggle_favorite(
    listing_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(
        select(SavedListing).where(
            SavedListing.user_id == current_user.id,
            SavedListing.listing_id == listing_id,
        )
    )
    row = existing.scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()
        return {"saved": False}
    db.add(SavedListing(user_id=current_user.id, listing_id=listing_id))
    await db.commit()
    return {"saved": True}


@router.get("", response_model=list[ListingOut])
async def get_favorites(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Listing, SavedListing.saved_at)
        .join(SavedListing, SavedListing.listing_id == Listing.id)
        .where(
            SavedListing.user_id == current_user.id,
            Listing.deleted_at.is_(None),
        )
        .order_by(SavedListing.saved_at.desc())
    )
    rows = result.all()
    out = []
    for listing, _ in rows:
        item = ListingOut.model_validate(listing)
        cat_res = await db.execute(select(Category).where(Category.id == listing.category_id))
        cat = cat_res.scalar_one_or_none()
        if cat:
            item.category_name = cat.name
            item.category_slug = cat.slug
        out.append(item)
    return out


@router.get("/ids", response_model=list[str])
async def get_favorite_ids(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SavedListing.listing_id).where(SavedListing.user_id == current_user.id)
    )
    return [str(r) for r in result.scalars().all()]


@router.get("/count/{listing_id}", response_model=dict)
async def get_save_count(listing_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(func.count()).select_from(SavedListing).where(SavedListing.listing_id == listing_id)
    )
    return {"count": result.scalar_one()}
