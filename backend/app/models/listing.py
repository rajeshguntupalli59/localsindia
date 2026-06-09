import uuid
from datetime import datetime, timezone, timedelta
from typing import Any
from sqlalchemy import String, Text, Numeric, Boolean, Integer, ForeignKey, CheckConstraint, Index, Computed, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, TSVECTOR
from app.core.database import Base


class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cities.id", ondelete="RESTRICT"), nullable=False
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    contact_phone: Mapped[str] = mapped_column(String(15), nullable=False)
    whatsapp_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    report_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc) + timedelta(days=30)
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    search_vector: Mapped[Any | None] = mapped_column(
        TSVECTOR,
        Computed(
            "to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))",
            persisted=True,
        ),
        nullable=True,
    )

    images: Mapped[list["ListingImage"]] = relationship(
        "ListingImage",
        primaryjoin="Listing.id == foreign(ListingImage.listing_id)",
        order_by="ListingImage.display_order",
        lazy="selectin",
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','active','expired','rejected','flagged','fulfilled')",
            name="ck_listings_status",
        ),
        Index("idx_listings_city", "city_id", "status", "created_at"),
        Index("idx_listings_category", "category_id"),
        Index("idx_listings_user", "user_id"),
        Index("idx_listings_status", "status"),
    )
