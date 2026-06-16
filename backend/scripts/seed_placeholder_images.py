"""
One-time script: add placeholder images to all listings that have no photos.
Run from backend/: python scripts/seed_placeholder_images.py
"""
import asyncio
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, text
from app.core.database import async_session_factory
from app.models.listing import Listing
from app.models.listing_image import ListingImage

PLACEHOLDERS = [
    "https://placehold.co/400x300/f97316/white?text=LocalsIndia",
    "https://placehold.co/400x300/3b82f6/white?text=LocalsIndia",
    "https://placehold.co/400x300/10b981/white?text=LocalsIndia",
    "https://placehold.co/400x300/8b5cf6/white?text=LocalsIndia",
    "https://placehold.co/400x300/ef4444/white?text=LocalsIndia",
]


async def run():
    async with async_session_factory() as db:
        # Find all listings with no images
        result = await db.execute(
            select(Listing).where(Listing.deleted_at.is_(None))
        )
        listings = result.scalars().all()

        count = 0
        for i, listing in enumerate(listings):
            img_result = await db.execute(
                select(ListingImage).where(ListingImage.listing_id == listing.id)
            )
            images = img_result.scalars().all()
            if images:
                continue  # already has photos

            placeholder_url = PLACEHOLDERS[i % len(PLACEHOLDERS)]
            img = ListingImage(
                listing_id=listing.id,
                url=placeholder_url,
                cloudinary_id=f"placeholder/{uuid.uuid4()}",
                display_order=0,
            )
            db.add(img)
            count += 1

        await db.commit()
        print(f"Done — added placeholder images to {count} listings.")


if __name__ == "__main__":
    asyncio.run(run())
