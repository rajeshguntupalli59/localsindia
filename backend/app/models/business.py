import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Boolean, Integer, Numeric, ForeignKey, Index, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cities.id", ondelete="RESTRICT"), nullable=False
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(15), nullable=True)
    whatsapp_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    website_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    badge_plan: Mapped[str | None] = mapped_column(String(20), nullable=True)
    badge_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    avg_rating: Mapped[float | None] = mapped_column(Numeric(3, 2), default=0)
    review_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    reviews: Mapped[list["Review"]] = relationship(
        "Review",
        primaryjoin="Business.id == foreign(Review.business_id)",
        order_by="Review.created_at.desc()",
        lazy="selectin",
    )
    images: Mapped[list["BusinessImage"]] = relationship(
        "BusinessImage",
        primaryjoin="Business.id == foreign(BusinessImage.business_id)",
        order_by="BusinessImage.display_order",
        lazy="selectin",
    )

    __table_args__ = (
        Index("idx_businesses_city", "city_id", "category_id"),
        Index("idx_businesses_owner", "owner_id"),
    )
