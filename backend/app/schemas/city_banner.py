import uuid
from datetime import date, datetime
from pydantic import BaseModel


class CityBannerCreate(BaseModel):
    city_id: uuid.UUID
    advertiser_name: str
    image_url: str
    link_url: str
    start_date: date
    end_date: date


class CityBannerOut(BaseModel):
    id: uuid.UUID
    city_id: uuid.UUID
    advertiser_name: str
    image_url: str
    link_url: str
    start_date: date
    end_date: date
    created_at: datetime

    model_config = {"from_attributes": True}
