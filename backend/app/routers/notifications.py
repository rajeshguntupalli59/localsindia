import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user_notification import UserNotification
from app.models.user import User

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


class NotificationOut(BaseModel):
    id: str
    type: str
    title: str
    body: Optional[str]
    action_url: Optional[str]
    is_read: bool
    listing_id: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    limit: int = Query(20, le=50),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserNotification)
        .where(UserNotification.user_id == current_user.id)
        .order_by(UserNotification.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = result.scalars().all()
    return [
        NotificationOut(
            id=str(n.id),
            type=n.type,
            title=n.title,
            body=n.body,
            action_url=n.action_url,
            is_read=n.is_read,
            listing_id=str(n.listing_id) if n.listing_id else None,
            created_at=n.created_at,
        )
        for n in rows
    ]


@router.get("/unread-count", response_model=dict)
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(func.count()).select_from(UserNotification).where(
            UserNotification.user_id == current_user.id,
            UserNotification.is_read == False,
        )
    )
    return {"count": result.scalar_one()}


@router.post("/read/{notification_id}", status_code=200)
async def mark_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        update(UserNotification)
        .where(UserNotification.id == notification_id, UserNotification.user_id == current_user.id)
        .values(is_read=True)
    )
    await db.commit()
    return {"ok": True}


@router.post("/read-all", status_code=200)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        update(UserNotification)
        .where(UserNotification.user_id == current_user.id, UserNotification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return {"ok": True}
