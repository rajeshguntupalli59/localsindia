import uuid
from pydantic import BaseModel


class CategoryOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    icon: str | None
    sort_order: int

    model_config = {"from_attributes": True}
