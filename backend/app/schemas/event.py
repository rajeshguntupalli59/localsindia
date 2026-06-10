import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator


class EventCreate(BaseModel):
    title: str
    description: str
    venue: str
    event_date: datetime
    city_id: uuid.UUID
    category_id: uuid.UUID | None = None
    is_free: bool = True
    ticket_url: str | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        if len(v.strip()) < 3:
            raise ValueError("Title must be at least 3 characters")
        return v.strip()

    @field_validator("venue")
    @classmethod
    def validate_venue(cls, v: str) -> str:
        if len(v.strip()) < 3:
            raise ValueError("Venue must be at least 3 characters")
        return v.strip()


class EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    venue: str | None = None
    event_date: datetime | None = None
    is_free: bool | None = None
    ticket_url: str | None = None
    status: str | None = None


class EventOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    venue: str
    event_date: datetime
    is_free: bool
    ticket_url: str | None
    status: str
    city_id: uuid.UUID
    user_id: uuid.UUID
    category_id: uuid.UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}
