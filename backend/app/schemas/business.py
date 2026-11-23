import re
import uuid
from datetime import datetime
from pydantic import BaseModel, Field, computed_field, field_validator, model_validator
from app.core.category_catalog import subcategory_entry

from app.schemas.validators import web_url

PHONE_RE = re.compile(r"^\+91[6-9]\d{9}$")


class BusinessCreate(BaseModel):
    name: str
    city_id: uuid.UUID
    category_id: uuid.UUID | None = None
    subcategory_slug: str | None = None
    description: str | None = None
    address: str | None = None
    phone: str | None = None
    whatsapp_url: str | None = None
    website_url: str | None = None

    @field_validator("whatsapp_url", "website_url")
    @classmethod
    def validate_links(cls, v: str | None) -> str | None:
        return web_url(v)


class BusinessUpdate(BaseModel):
    name: str | None = None
    category_id: uuid.UUID | None = None
    subcategory_slug: str | None = None
    description: str | None = None
    address: str | None = None
    phone: str | None = None
    whatsapp_url: str | None = None
    website_url: str | None = None
    # Map pin — both or neither, inside India (checked below)
    latitude: float | None = Field(default=None, ge=6, le=38)
    longitude: float | None = Field(default=None, ge=68, le=98)
    # OpenStreetMap syntax, e.g. "Mo-Sa 09:00-21:00; Su off"
    opening_hours: str | None = Field(default=None, max_length=255)

    @field_validator("whatsapp_url", "website_url")
    @classmethod
    def validate_links(cls, v: str | None) -> str | None:
        return web_url(v)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str | None) -> str:
        # Sent as null/blank would wipe the business name; the router uses
        # exclude_unset, so this only runs when "name" is actually sent
        if v is None or not v.strip():
            raise ValueError("Business name can't be empty")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        if not PHONE_RE.match(v):
            raise ValueError("Enter a valid Indian mobile number, e.g. +919876543210")
        return v

    @model_validator(mode="after")
    def pin_together(self):
        sent = self.model_fields_set
        if ("latitude" in sent) != ("longitude" in sent):
            raise ValueError("Send latitude and longitude together")
        return self


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
    category_slug: str | None = None
    subcategory_slug: str | None = None
    city_slug: str | None = None
    owner_id: uuid.UUID | None
    source: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    locality: str | None = None
    locality_slug: str | None = None
    opening_hours: str | None = None
    indexable: bool = True
    created_at: datetime
    reviews: list[ReviewOut] = []
    images: list[BusinessImageOut] = []

    @computed_field
    @property
    def subcategory_name(self) -> str | None:
        sub = subcategory_entry(self.subcategory_slug)
        return sub[1]["name"] if sub else None

    model_config = {"from_attributes": True}
