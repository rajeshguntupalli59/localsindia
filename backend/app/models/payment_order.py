import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class PaymentOrder(Base):
    """Server-side record of a Razorpay order, created at the same time the
    order is created with Razorpay. Verification looks the plan/target up
    from here instead of trusting the client-supplied values in the verify
    request — the Razorpay signature only proves (order_id, payment_id)
    belong together, not what plan was paid for or which listing/business
    it's for, so trusting the client for those let someone pay for a cheap
    plan and claim a more expensive one, or replay one payment across
    multiple listings they own."""

    __tablename__ = "payment_orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    razorpay_order_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[str] = mapped_column(String(30), nullable=False)  # "featured_listing" | "business_badge"
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)  # listing_id or business_id
    plan: Mapped[str] = mapped_column(String(20), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # paise, as sent to Razorpay
    consumed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
