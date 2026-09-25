"""Admin bulk import of directory businesses from open data (OpenStreetMap).

Imported businesses have no owner — they're claimed later through
routers/business_claims.py. Re-running an import is safe: rows whose
source_ref already exists are skipped, never duplicated or overwritten
(an owner may have edited them since)."""
import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.business import Business
from app.models.category import Category
from app.models.city import City
from app.models.user import User

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

MAX_BATCH = 500


class ImportedBusiness(BaseModel):
    name: str = Field(max_length=150)
    category_slug: str
    source_ref: str = Field(max_length=40)          # e.g. "node/123456"
    address: str | None = None
    phone: str | None = Field(default=None, max_length=15)
    website_url: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class ImportRequest(BaseModel):
    city_slug: str
    source: str = "osm"
    businesses: list[ImportedBusiness]


@router.post("/businesses/import")
async def import_businesses(
    body: ImportRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if len(body.businesses) > MAX_BATCH:
        raise HTTPException(status_code=400, detail=f"Send at most {MAX_BATCH} businesses per request.")
    city = (await db.execute(
        select(City).where(City.slug == body.city_slug, City.active == True)
    )).scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found.")

    categories = {c.slug: c.id for c in (await db.execute(select(Category))).scalars().all()}
    refs = [b.source_ref for b in body.businesses]
    existing = set((await db.execute(
        select(Business.source_ref).where(Business.source_ref.in_(refs))
    )).scalars().all())

    created, skipped_existing, unknown_category = 0, 0, 0
    seen: set[str] = set()
    for b in body.businesses:
        if b.source_ref in existing or b.source_ref in seen:
            skipped_existing += 1
            continue
        if b.category_slug not in categories:
            unknown_category += 1
            continue
        seen.add(b.source_ref)
        db.add(Business(
            city_id=city.id,
            owner_id=None,
            category_id=categories[b.category_slug],
            name=b.name.strip(),
            address=b.address,
            phone=b.phone,
            website_url=b.website_url,
            latitude=b.latitude,
            longitude=b.longitude,
            source=body.source,
            source_ref=b.source_ref,
        ))
        created += 1
    await db.commit()
    return {"created": created, "skipped_existing": skipped_existing, "unknown_category": unknown_category}


class RemoveRequest(BaseModel):
    business_ids: list[uuid.UUID] = Field(max_length=500)
    reason: str


@router.post("/businesses/import/remove")
async def remove_imported_businesses(
    body: RemoveRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Soft-delete imported businesses that failed the import's quality checks
    (generic names, chain branches, duplicates). Only touches rows that came
    from an import AND nobody has claimed — a real owner's listing is never
    removed this way."""
    rows = (await db.execute(
        select(Business).where(
            Business.id.in_(body.business_ids),
            Business.source.is_not(None),
            Business.owner_id.is_(None),
            Business.deleted_at.is_(None),
        )
    )).scalars().all()
    now = datetime.now(timezone.utc)
    for b in rows:
        b.deleted_at = now
    await db.commit()
    return {"removed": len(rows), "skipped": len(body.business_ids) - len(rows), "reason": body.reason}


class MoveRequest(BaseModel):
    business_ids: list[uuid.UUID] = Field(max_length=500)
    city_slug: str


@router.post("/businesses/import/move")
async def move_imported_businesses(
    body: MoveRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Re-file imported businesses under the city they're actually nearest to
    (neighbouring cities' map boxes overlap). Unclaimed imports only."""
    city = (await db.execute(
        select(City).where(City.slug == body.city_slug, City.active == True)
    )).scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found.")
    rows = (await db.execute(
        select(Business).where(
            Business.id.in_(body.business_ids),
            Business.source.is_not(None),
            Business.owner_id.is_(None),
            Business.deleted_at.is_(None),
        )
    )).scalars().all()
    for b in rows:
        b.city_id = city.id
    await db.commit()
    return {"moved": len(rows), "skipped": len(body.business_ids) - len(rows)}


def locality_slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:90]


class LocalityItem(BaseModel):
    id: uuid.UUID
    locality: str | None = Field(default=None, max_length=80)   # None clears it


class LocalitiesRequest(BaseModel):
    city_slug: str
    items: list[LocalityItem]


@router.post("/businesses/import/localities")
async def set_business_localities(
    body: LocalitiesRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Set each business's neighbourhood (from agents/assign_localities.py).
    Only businesses in the given city are touched."""
    if len(body.items) > 2000:
        raise HTTPException(status_code=400, detail="Send at most 2000 items per request.")
    city = (await db.execute(select(City).where(City.slug == body.city_slug))).scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found.")
    wanted = {i.id: (i.locality or "").strip() or None for i in body.items}
    rows = (await db.execute(
        select(Business).where(Business.id.in_(wanted), Business.city_id == city.id, Business.deleted_at.is_(None))
    )).scalars().all()
    for b in rows:
        name = wanted[b.id]
        b.locality = name
        b.locality_slug = locality_slug(name) if name else None
    await db.commit()
    return {"updated": len(rows), "skipped": len(body.items) - len(rows)}
