import base64
import hashlib
import hmac
import io
import secrets
import uuid

import httpx
import qrcode
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.event import Event
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.ticket import (
    TicketCreateOrderRequest,
    TicketCreateOrderResponse,
    TicketVerifyRequest,
    TicketOut,
)

router = APIRouter(prefix="/api/v1/tickets", tags=["tickets"])

RAZORPAY_API = "https://api.razorpay.com/v1"


def _razorpay_auth() -> str:
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Payment gateway not configured.")
    token = base64.b64encode(
        f"{settings.RAZORPAY_KEY_ID}:{settings.RAZORPAY_KEY_SECRET}".encode()
    ).decode()
    return f"Basic {token}"


async def _get_ticketed_event(event_id: uuid.UUID, db: AsyncSession) -> Event:
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.deleted_at.is_(None))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    if event.is_free or not event.ticket_price:
        raise HTTPException(status_code=400, detail="This event does not sell tickets in-app.")
    return event


def _make_qr_data_uri(token: str) -> str:
    img = qrcode.make(token)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    encoded = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{encoded}"


def _ticket_out(ticket: Ticket, event: Event) -> TicketOut:
    return TicketOut(
        id=ticket.id,
        event_id=ticket.event_id,
        amount=ticket.amount,
        qr_token=ticket.qr_token,
        qr_image=_make_qr_data_uri(ticket.qr_token),
        used_at=ticket.used_at,
        created_at=ticket.created_at,
        event_title=event.title,
        event_venue=event.venue,
        event_date=event.event_date,
    )


@router.post("/create-order", response_model=TicketCreateOrderResponse)
async def create_ticket_order(
    body: TicketCreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = await _get_ticketed_event(body.event_id, db)
    amount = int(round(float(event.ticket_price) * 100))

    auth = _razorpay_auth()
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{RAZORPAY_API}/orders",
                headers={"Authorization": auth, "Content-Type": "application/json"},
                json={
                    "amount": amount,
                    "currency": "INR",
                    "receipt": str(body.event_id)[:40],
                    "notes": {
                        "event_id": str(body.event_id),
                        "user_id": str(current_user.id),
                        "type": "event_ticket",
                    },
                },
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Razorpay error: {resp.text}")
        order = resp.json()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Payment gateway error: {exc}") from exc

    return TicketCreateOrderResponse(
        order_id=order["id"],
        amount=amount,
        currency="INR",
        key_id=settings.RAZORPAY_KEY_ID,
        event_id=str(body.event_id),
    )


@router.post("/verify", response_model=TicketOut)
async def verify_ticket_payment(
    body: TicketVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expected = hmac.new(
        key=settings.RAZORPAY_KEY_SECRET.encode(),
        msg=f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        digestmod=hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment verification failed.")

    event = await _get_ticketed_event(body.event_id, db)
    amount = int(round(float(event.ticket_price) * 100))

    ticket = Ticket(
        event_id=event.id,
        user_id=current_user.id,
        amount=amount,
        razorpay_order_id=body.razorpay_order_id,
        razorpay_payment_id=body.razorpay_payment_id,
        qr_token=secrets.token_urlsafe(24),
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return _ticket_out(ticket, event)


@router.get("/my", response_model=list[TicketOut])
async def list_my_tickets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.event))
        .where(Ticket.user_id == current_user.id)
        .order_by(Ticket.created_at.desc())
    )
    tickets = result.scalars().all()
    return [_ticket_out(t, t.event) for t in tickets]


@router.get("/{ticket_id}", response_model=TicketOut)
async def get_ticket(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Ticket).options(selectinload(Ticket.event)).where(Ticket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    if ticket.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your ticket.")
    return _ticket_out(ticket, ticket.event)
