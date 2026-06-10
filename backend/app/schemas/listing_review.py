import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator


class ListingReviewCreate(BaseModel):
    rating: int
    body: str | None = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class ListingReviewOut(BaseModel):
    id: uuid.UUID
    listing_id: uuid.UUID
    user_id: uuid.UUID
    rating: int
    body: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
