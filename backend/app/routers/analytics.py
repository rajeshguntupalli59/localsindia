import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.business import Business
from app.models.analytics_event import AnalyticsEvent
from app.models.user import User
from app.schemas.analytics import BusinessAnalyticsOut, DailyTrendPoint

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])

TREND_DAYS = 30


@router.get("/business/{business_id}", response_model=BusinessAnalyticsOut)
async def get_business_analytics(
    business_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Business).where(Business.id == business_id, Business.deleted_at.is_(None))
    )
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found.")
    if business.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your business.")

    since = datetime.now(timezone.utc) - timedelta(days=TREND_DAYS)

    totals_result = await db.execute(
        select(AnalyticsEvent.event_type, func.count(AnalyticsEvent.id))
        .where(AnalyticsEvent.business_id == business_id, AnalyticsEvent.created_at >= since)
        .group_by(AnalyticsEvent.event_type)
    )
    totals = dict(totals_result.all())

    daily_result = await db.execute(
        select(
            func.date(AnalyticsEvent.created_at).label("day"),
            AnalyticsEvent.event_type,
            func.count(AnalyticsEvent.id),
        )
        .where(AnalyticsEvent.business_id == business_id, AnalyticsEvent.created_at >= since)
        .group_by("day", AnalyticsEvent.event_type)
        .order_by("day")
    )
    daily_rows: dict[str, dict[str, int]] = {}
    for day, event_type, count in daily_result.all():
        key = day.isoformat()
        daily_rows.setdefault(key, {"views": 0, "whatsapp_clicks": 0})
        if event_type == "view":
            daily_rows[key]["views"] = count
        elif event_type == "whatsapp_click":
            daily_rows[key]["whatsapp_clicks"] = count

    daily_trend = [
        DailyTrendPoint(date=day, views=v["views"], whatsapp_clicks=v["whatsapp_clicks"])
        for day, v in sorted(daily_rows.items())
    ]

    return BusinessAnalyticsOut(
        views_30d=totals.get("view", 0),
        whatsapp_clicks_30d=totals.get("whatsapp_click", 0),
        review_count=business.review_count,
        avg_rating=float(business.avg_rating) if business.avg_rating else 0.0,
        daily_trend=daily_trend,
    )
