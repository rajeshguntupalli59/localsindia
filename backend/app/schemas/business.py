import uuid
from datetime import datetime
from pydantic import BaseModel


class BusinessCreate(BaseModel):
    name: str
    city_id: uuid.UUID
    category_id: uuid.UUID | None = None
    description: str | None = None
    address: str | None = None
    phone: str | None = None
    whatsapp_url: str | None = None
    website_url: str | None = None


class BusinessUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    address: str | None = None
    phone: str | None = None
    whatsapp_url: str | None = None
    website_url: str | None = None


class ReviewCreate(BaseModel):
    rating: int
    body: str | None = None

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        return v


class ReviewOut(BaseModel):
    id: uuid.UUID
    rating: int
    body: str | None
    user_id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class BusinessImageOut(BaseModel):
    id: uuid.UUID
    url: str
    display_order: int

    model_config = {"from_attributes": True}


class BusinessOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    address: str | None
    phone: str | None
    whatsapp_url: str | None
    website_url: str | None
    verified: bool
    badge_plan: str | None = None
    badge_expires_at: datetime | None = None
    avg_rating: float | None
    review_count: int
    city_id: uuid.UUID
    category_id: uuid.UUID | None
    owner_id: uuid.UUID | None
    created_at: datetime
    reviews: list[ReviewOut] = []
    images: list[BusinessImageOut] = []

    model_config = {"from_attributes": True}
