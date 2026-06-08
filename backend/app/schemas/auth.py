import re
import uuid
from pydantic import BaseModel, field_validator

PHONE_RE = re.compile(r"^\+91[6-9]\d{9}$")


class OtpSendRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not PHONE_RE.match(v):
            raise ValueError("Enter a valid Indian mobile number (+91XXXXXXXXXX)")
        return v


class OtpVerifyRequest(BaseModel):
    phone: str
    otp: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not PHONE_RE.match(v):
            raise ValueError("Enter a valid Indian mobile number (+91XXXXXXXXXX)")
        return v


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: uuid.UUID
    phone: str | None
    email: str | None
    name: str
    role: str
    lang_pref: str

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut
