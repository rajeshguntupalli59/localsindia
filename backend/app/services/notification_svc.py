"""Helper to create in-app notifications and optionally send emails."""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user_notification import UserNotification


async def notify(
    db: AsyncSession,
    user_id: uuid.UUID,
    type: str,
    title: str,
    body: str | None = None,
    action_url: str | None = None,
    listing_id: uuid.UUID | None = None,
) -> UserNotification:
    n = UserNotification(
        user_id=user_id,
        type=type,
        title=title,
        body=body,
        action_url=action_url,
        listing_id=listing_id,
    )
    db.add(n)
    await db.commit()
    return n
