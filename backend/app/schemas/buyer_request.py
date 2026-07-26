import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator
from app.schemas.listing import PHONE_RE


class BuyerRequestCreate(BaseModel):
    city_slug: str
    category_slug: str
    description: str
    budget: float | None = None
    contact_phone: str

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        if len(v.strip()) < 10:
            raise ValueError("Description must be at least 10 characters")
        return v.strip()

    @field_validator("contact_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not PHONE_RE.match(v):
            raise ValueError("Enter a valid Indian mobile number (+91XXXXXXXXXX)")
        return v


class BuyerRequestOut(BaseModel):
    id: uuid.UUID
    description: str
    budget: float | None
    contact_phone: str
    status: str
    report_count: int = 0
    created_at: datetime
    city_id: uuid.UUID
    category_id: uuid.UUID | None
    user_id: uuid.UUID
    category_name: str | None = None
    category_slug: str | None = None
    category_icon: str | None = None

    model_config = {"from_attributes": True}
