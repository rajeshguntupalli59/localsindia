import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, ForeignKey, CheckConstraint, UniqueConstraint, Index, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class BuyerRequestReport(Base):
    __tablename__ = "buyer_request_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    buyer_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("buyer_requests.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    reason: Mapped[str] = mapped_column(String(50), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint(
            "reason IN ('spam','inappropriate','duplicate','wrong_category','other')",
            name="ck_buyer_request_reports_reason",
        ),
        UniqueConstraint("buyer_request_id", "user_id", name="uq_buyer_request_reports_request_user"),
        Index("idx_buyer_request_reports_request", "buyer_request_id"),
    )
