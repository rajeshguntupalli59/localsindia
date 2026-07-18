import uuid
from datetime import datetime
from pydantic import BaseModel


class TicketCreateOrderRequest(BaseModel):
    event_id: uuid.UUID


class TicketCreateOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    key_id: str
    event_id: str


class TicketVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    event_id: uuid.UUID


class TicketOut(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    amount: int
    qr_token: str
    qr_image: str
    used_at: datetime | None
    created_at: datetime
    event_title: str
    event_venue: str
    event_date: datetime

    model_config = {"from_attributes": True}


class TicketScanRequest(BaseModel):
    qr_token: str


class TicketScanResponse(BaseModel):
    status: str
    ticket_id: uuid.UUID
    event_title: str
    attendee_name: str | None
    used_at: datetime
