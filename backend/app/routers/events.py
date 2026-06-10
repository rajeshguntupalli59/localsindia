import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.city import City
from app.models.event import Event
from app.models.user import User
from app.schemas.event import EventCreate, EventOut, EventUpdate

router = APIRouter(prefix="/api/v1", tags=["events"])


async def _get_active_event(event_id: uuid.UUID, db: AsyncSession) -> Event:
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.deleted_at.is_(None))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    return event


@router.get("/events", response_model=list[EventOut])
async def list_events(
    city_slug: str = Query(...),
    category_id: uuid.UUID | None = Query(default=None),
    from_date: datetime | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=50),
    db: AsyncSession = Depends(get_db),
):
    city_result = await db.execute(select(City).where(City.slug == city_slug, City.active == True))
    city = city_result.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found.")

    q = (
        select(Event)
        .where(
            Event.city_id == city.id,
            Event.status == "active",
            Event.deleted_at.is_(None),
        )
        .order_by(Event.event_date.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if category_id:
        q = q.where(Event.category_id == category_id)
    if from_date:
        q = q.where(Event.event_date >= from_date)

    result = await db.execute(q)
    return result.scalars().all()


@router.post("/events", response_model=EventOut, status_code=201)
async def create_event(
    payload: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    city_result = await db.execute(select(City).where(City.id == payload.city_id, City.active == True))
    if not city_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="City not found.")

    event = Event(
        city_id=payload.city_id,
        user_id=current_user.id,
        category_id=payload.category_id,
        title=payload.title,
        description=payload.description,
        venue=payload.venue,
        event_date=payload.event_date,
        is_free=payload.is_free,
        ticket_url=payload.ticket_url,
        status="pending",
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.get("/events/{event_id}", response_model=EventOut)
async def get_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    return await _get_active_event(event_id, db)


@router.patch("/events/{event_id}", response_model=EventOut)
async def update_event(
    event_id: uuid.UUID,
    payload: EventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await _get_active_event(event_id, db)
    if event.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorised.")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(event, field, value)
    event.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/events/{event_id}", status_code=204)
async def delete_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await _get_active_event(event_id, db)
    if event.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorised.")

    event.deleted_at = datetime.now(timezone.utc)
    await db.commit()
