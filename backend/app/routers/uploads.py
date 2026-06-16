import uuid

import cloudinary.exceptions
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.listing import Listing
from app.models.listing_image import ListingImage
from app.models.user import User
from app.services import cloudinary_svc

router = APIRouter(prefix="/api/v1/upload", tags=["uploads"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_IMAGES_PER_LISTING = 5


@router.post("/image/{listing_id}", status_code=201)
async def upload_image(
    listing_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check ownership
    result = await db.execute(
        select(Listing).where(Listing.id == listing_id, Listing.deleted_at.is_(None))
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    if listing.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorised.")

    # Validate type (BL-08)
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP images allowed.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be under 5 MB.")

    # Check image count limit
    count_result = await db.execute(
        select(ListingImage).where(ListingImage.listing_id == listing_id)
    )
    if len(count_result.scalars().all()) >= MAX_IMAGES_PER_LISTING:
        raise HTTPException(status_code=400, detail="Maximum 5 images per listing.")

    try:
        uploaded = await cloudinary_svc.upload_image(file_bytes, file.filename or "image")
    except cloudinary.exceptions.Error:
        raise HTTPException(status_code=400, detail="Could not process image. Please try a different photo.")

    img = ListingImage(
        listing_id=listing_id,
        url=uploaded["url"],
        cloudinary_id=uploaded["cloudinary_id"],
        display_order=0,
    )
    db.add(img)
    await db.commit()
    await db.refresh(img)
    return {"id": str(img.id), "url": img.url, "cloudinary_id": img.cloudinary_id}


@router.delete("/image/{image_id}", status_code=204)
async def delete_image(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ListingImage).where(ListingImage.id == image_id)
    )
    img = result.scalar_one_or_none()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found.")

    # Verify ownership via listing
    listing_result = await db.execute(
        select(Listing).where(Listing.id == img.listing_id, Listing.deleted_at.is_(None))
    )
    listing = listing_result.scalar_one_or_none()
    if not listing or (listing.user_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(status_code=403, detail="Not authorised.")

    await cloudinary_svc.delete_image(img.cloudinary_id)
    await db.delete(img)
    await db.commit()
