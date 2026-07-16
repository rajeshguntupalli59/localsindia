import re
import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator

PHONE_RE = re.compile(r"^\+91[6-9]\d{9}$")
WA_RE = re.compile(r"^https://wa\.me/91\d{10}$")


class ListingCreate(BaseModel):
    title: str
    description: str
    category_id: uuid.UUID | None = None
    city_id: uuid.UUID | None = None
    category_slug: str | None = None
    city_slug: str | None = None
    contact_phone: str
    price: float | None = None
    whatsapp_url: str | None = None
    website_url: str | None = None
    social_url: str | None = None
    area: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    @field_validator("contact_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not PHONE_RE.match(v):
            raise ValueError("Enter a valid Indian mobile number (+91XXXXXXXXXX)")
        return v

    @field_validator("whatsapp_url")
    @classmethod
    def validate_wa(cls, v: str | None) -> str | None:
        if v and not WA_RE.match(v):
            raise ValueError("WhatsApp URL must be https://wa.me/91XXXXXXXXXX")
        return v


class ListingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    price: float | None = None
    whatsapp_url: str | None = None
    website_url: str | None = None
    social_url: str | None = None
    area: str | None = None

    @field_validator("whatsapp_url")
    @classmethod
    def validate_wa(cls, v: str | None) -> str | None:
        if v and not WA_RE.match(v):
            raise ValueError("WhatsApp URL must be https://wa.me/91XXXXXXXXXX")
        return v


class ListingImageOut(BaseModel):
    id: uuid.UUID
    url: str
    display_order: int

    model_config = {"from_attributes": True}


class ListingOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    price: float | None
    contact_phone: str
    whatsapp_url: str | None
    website_url: str | None = None
    social_url: str | None = None
    area: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    status: str
    is_featured: bool
    wa_verified: bool = False
    view_count: int = 0
    contact_click_count: int = 0
    last_renewed_at: datetime | None = None
    expires_at: datetime
    created_at: datetime
    city_id: uuid.UUID
    category_id: uuid.UUID
    user_id: uuid.UUID
    images: list[ListingImageOut] = []
    city_slug: str | None = None
    category_name: str | None = None
    category_slug: str | None = None
    seller_name: str | None = None

    model_config = {"from_attributes": True}


class ReportCreate(BaseModel):
    reason: str
    notes: str | None = None

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, v: str) -> str:
        allowed = {"spam", "inappropriate", "duplicate", "wrong_category", "other"}
        if v not in allowed:
            raise ValueError(f"reason must be one of {allowed}")
        return v
