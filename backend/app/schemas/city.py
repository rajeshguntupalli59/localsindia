import uuid
from pydantic import BaseModel


class CityOut(BaseModel):
    id: uuid.UUID
    name: str
    state: str
    slug: str
    lang_default: str
    active: bool

    model_config = {"from_attributes": True}
