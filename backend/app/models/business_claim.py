import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class BusinessClaim(Base):
    """A request by a user to become the owner of a directory business.

    Two methods:
      - 'otp': a code sent by SMS to the business's own listed mobile number.
        Approved instantly on a correct code. The OTP lives here, not in
        otp_requests, so it can never be redeemed as a login OTP (or vice versa).
      - 'documents': proof document + shopfront photo (+ optional visiting card)
        and a phone the admin can call back. Reviewed by an admin.

    Status: otp_sent → approved | expired (otp); pending → approved | rejected (documents).
    Documents are stored as Cloudinary *private* assets — never public;
    admins view them through signed download URLs that expire in 10 minutes.
    """
    __tablename__ = "business_claims"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    method: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)

    # OTP method
    otp_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    otp_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    otp_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Documents method
    contact_phone: Mapped[str | None] = mapped_column(String(15), nullable=True)
    doc_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    document_id: Mapped[str | None] = mapped_column(Text, nullable=True)      # Cloudinary public_id
    shop_photo_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    visiting_card_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    reject_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_business_claims_business", "business_id"),
        Index("idx_business_claims_status", "status"),
    )
