import uuid
from datetime import datetime, timezone
from sqlalchemy import Text, Integer, ForeignKey, CheckConstraint, UniqueConstraint, Index, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class ListingReview(Base):
    __tablename__ = "listing_reviews"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        CheckConstraint("rating BETWEEN 1 AND 5", name="ck_listing_reviews_rating"),
        UniqueConstraint("listing_id", "user_id", name="uq_listing_reviews_listing_user"),
        Index("idx_listing_reviews_listing", "listing_id", "created_at"),
        Index("idx_listing_reviews_user", "user_id"),
    )
