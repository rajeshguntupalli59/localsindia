import re
import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator

PHONE_RE = re.compile(r"^\+91[6-9]\d{9}$")
WA_RE = re.compile(r"^https://wa\.me/91\d{10}$")


# ── Category-specific detail schemas ────────────────────────────────────────
# One per category needing structured questions beyond title/description/price.
# `category_slug` on ListingCreate picks which of these validates the raw
# `category_details` dict — see DETAILS_SCHEMA_BY_CATEGORY_SLUG below and
# routers/listings.py, which persists the validated result into the matching
# *_details table (models/listing_details.py).

class VehicleDetailsIn(BaseModel):
    brand: str | None = None
    model: str | None = None
    year: int | None = None
    km_driven: int | None = None
    fuel_type: str | None = None
    transmission: str | None = None
    owners_count: int | None = None


class JobDetailsIn(BaseModel):
    company_name: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    job_type: str | None = None
    experience_required: str | None = None
    work_mode: str | None = None


class PgRoommateDetailsIn(BaseModel):
    room_type: str | None = None
    gender_preference: str | None = None
    deposit_amount: float | None = None
    amenities: list[str] | None = None


class RealEstateDetailsIn(BaseModel):
    property_type: str | None = None
    bhk: int | None = None
    sqft: int | None = None
    furnishing: str | None = None
    listing_type: str | None = None


class ElectronicsDetailsIn(BaseModel):
    brand: str | None = None
    model: str | None = None
    condition: str | None = None
    warranty_remaining: str | None = None


class FurnitureDetailsIn(BaseModel):
    material: str | None = None
    dimensions: str | None = None
    condition: str | None = None


class FashionDetailsIn(BaseModel):
    brand: str | None = None
    size: str | None = None
    gender: str | None = None


class EducationDetailsIn(BaseModel):
    course_type: str | None = None
    mode: str | None = None
    duration: str | None = None


class DoctorDetailsIn(BaseModel):
    specialization: str | None = None
    consultation_fee: float | None = None
    available_timings: str | None = None


class ServiceDetailsIn(BaseModel):
    service_type: str | None = None
    experience_years: int | None = None


class TiffinDetailsIn(BaseModel):
    meal_type: str | None = None
    delivery_area: str | None = None
    subscription_available: bool | None = None


DETAILS_SCHEMA_BY_CATEGORY_SLUG: dict[str, type[BaseModel]] = {
    "vehicles": VehicleDetailsIn,
    "jobs": JobDetailsIn,
    "pg-roommate": PgRoommateDetailsIn,
    "real-estate": RealEstateDetailsIn,
    "electronics": ElectronicsDetailsIn,
    "furniture": FurnitureDetailsIn,
    "fashion": FashionDetailsIn,
    "education": EducationDetailsIn,
    "doctors": DoctorDetailsIn,
    "services": ServiceDetailsIn,
    "tiffin": TiffinDetailsIn,
}


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
    category_details: dict | None = None
    is_seed: bool = False  # only honored server-side when the caller is an admin
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
    is_seed: bool = False
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
    category_details: dict | None = None

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
