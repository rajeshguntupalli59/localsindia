import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

PLACEHOLDER_URLS = [
    "https://placehold.co/400x300/f97316/white?text=LocalsIndia",
    "https://placehold.co/400x300/3b82f6/white?text=LocalsIndia",
    "https://placehold.co/400x300/10b981/white?text=LocalsIndia",
    "https://placehold.co/400x300/8b5cf6/white?text=LocalsIndia",
    "https://placehold.co/400x300/ef4444/white?text=LocalsIndia",
]

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.event import Event
from app.models.listing import Listing
from app.models.report import Report
from app.models.user import User
from app.schemas.event import EventOut
from app.schemas.listing import ListingOut


class RoleUpdate(BaseModel):
    role: str

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/listings/pending", response_model=list[ListingOut])
async def pending_listings(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Listing)
        .where(Listing.status == "pending", Listing.deleted_at.is_(None))
        .order_by(Listing.created_at.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return result.scalars().all()


@router.get("/listings", response_model=list[ListingOut])
async def list_listings_by_status(
    status: str = "active",
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Listing)
        .where(Listing.status == status, Listing.deleted_at.is_(None))
        .order_by(Listing.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return result.scalars().all()


@router.patch("/listings/{listing_id}/approve", response_model=ListingOut)
async def approve_listing(
    listing_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Listing).where(Listing.id == listing_id, Listing.deleted_at.is_(None))
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    listing.status = "active"
    await db.commit()
    await db.refresh(listing)
    return listing


@router.patch("/listings/{listing_id}/reject", response_model=ListingOut)
async def reject_listing(
    listing_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Listing).where(Listing.id == listing_id, Listing.deleted_at.is_(None))
    )
    listing = result.scalar_one_or_none()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")
    listing.status = "rejected"
    await db.commit()
    await db.refresh(listing)
    return listing


@router.get("/events/pending", response_model=list[EventOut])
async def pending_events(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Event)
        .where(Event.status == "pending", Event.deleted_at.is_(None))
        .order_by(Event.created_at.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return result.scalars().all()


@router.get("/events", response_model=list[EventOut])
async def list_events_by_status(
    status: str = "active",
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Event)
        .where(Event.status == status, Event.deleted_at.is_(None))
        .order_by(Event.event_date.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return result.scalars().all()


@router.patch("/events/{event_id}/approve", response_model=EventOut)
async def approve_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.deleted_at.is_(None))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    event.status = "active"
    await db.commit()
    await db.refresh(event)
    return event


@router.patch("/events/{event_id}/reject", response_model=EventOut)
async def reject_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.deleted_at.is_(None))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    event.status = "cancelled"
    await db.commit()
    await db.refresh(event)
    return event


@router.get("/users")
async def list_users(
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(User)
        .where(User.deleted_at.is_(None))
        .order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    users = result.scalars().all()
    return [
        {
            "id": str(u.id),
            "phone": u.phone,
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: uuid.UUID,
    body: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    if body.role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'user'.")
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role.")
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.role = body.role
    await db.commit()
    await db.refresh(user)
    return {"id": str(user.id), "name": user.name, "role": user.role}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")
    result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.deleted_at = datetime.now(timezone.utc)
    user.is_active = False
    await db.commit()
    return {"success": True, "message": f"User {user_id} deleted."}


@router.post("/seed-placeholder-images")
async def seed_placeholder_images(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    """Add placeholder images to all listings that have no photos.
    Also corrects any previously-seeded placeholders with the old "LocalIndia" typo.
    """
    from app.models.listing_image import ListingImage

    fixed = 0
    typo_result = await db.execute(
        select(ListingImage).where(ListingImage.url.like("%text=LocalIndia%"))
    )
    for img in typo_result.scalars().all():
        img.url = img.url.replace("text=LocalIndia", "text=LocalsIndia")
        fixed += 1

    result = await db.execute(select(Listing).where(Listing.deleted_at.is_(None)))
    listings = result.scalars().all()

    added = 0
    for i, listing in enumerate(listings):
        img_result = await db.execute(
            select(ListingImage).where(ListingImage.listing_id == listing.id)
        )
        if img_result.scalars().first():
            continue
        img = ListingImage(
            listing_id=listing.id,
            url=PLACEHOLDER_URLS[i % len(PLACEHOLDER_URLS)],
            cloudinary_id=f"placeholder/{uuid.uuid4()}",
            display_order=0,
        )
        db.add(img)
        added += 1

    await db.commit()
    return {
        "seeded": added,
        "fixed_typo": fixed,
        "message": f"Added placeholder images to {added} listings; fixed typo on {fixed} existing images.",
    }


@router.get("/reports")
async def list_reports(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(Report)
        .order_by(Report.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    reports = result.scalars().all()
    return [
        {
            "id": str(r.id),
            "listing_id": str(r.listing_id),
            "user_id": str(r.user_id),
            "reason": r.reason,
            "notes": r.notes,
            "created_at": r.created_at.isoformat(),
        }
        for r in reports
    ]
