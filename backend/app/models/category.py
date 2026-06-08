import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, ForeignKey, Index, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    slug: Mapped[str] = mapped_column(String(90), unique=True, nullable=False)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    parent: Mapped["Category | None"] = relationship("Category", remote_side="Category.id")

    __table_args__ = (
        Index("idx_categories_parent", "parent_id"),
        Index("idx_categories_slug", "slug"),
    )
