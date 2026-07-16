"""Helper to create in-app notifications and push them to the user's devices."""
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user_notification import UserNotification
from app.models.device_token import DeviceToken


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

    # In-app only reaches the user while the app is open — also push to their
    # devices so they're notified even when it's closed/backgrounded.
    try:
        from app.services.push_svc import send_push
        result = await db.execute(select(DeviceToken.token).where(DeviceToken.user_id == user_id))
        tokens = [t for (t,) in result.all()]
        if tokens:
            await send_push(
                tokens, title, body or "",
                {"type": type, "action_url": action_url, "listing_id": str(listing_id) if listing_id else None},
            )
    except Exception:
        pass

    return n
