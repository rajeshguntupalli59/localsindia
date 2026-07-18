from pydantic import BaseModel


class DailyTrendPoint(BaseModel):
    date: str
    views: int
    whatsapp_clicks: int


class BusinessAnalyticsOut(BaseModel):
    views_30d: int
    whatsapp_clicks_30d: int
    review_count: int
    avg_rating: float
    daily_trend: list[DailyTrendPoint]
