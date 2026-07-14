import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator


class ErrorReportCreate(BaseModel):
    platform: str
    message: str
    stack: str | None = None
    context: str | None = None
    app_version: str | None = None

    @field_validator("platform")
    @classmethod
    def validate_platform(cls, v: str) -> str:
        if v not in ("mobile", "web"):
            raise ValueError("platform must be 'mobile' or 'web'")
        return v

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("message must not be empty")
        return v[:2000]

    @field_validator("stack")
    @classmethod
    def truncate_stack(cls, v: str | None) -> str | None:
        return v[:8000] if v else v


class ErrorLogOut(BaseModel):
    id: uuid.UUID
    platform: str
    message: str
    stack: str | None
    context: str | None
    app_version: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ErrorLogGroup(BaseModel):
    message: str
    platform: str
    context: str | None
    count: int
    last_seen: datetime
