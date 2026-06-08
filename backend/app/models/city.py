import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, CheckConstraint, Index, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class City(Base):
    __tablename__ = "cities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    lang_default: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint(
            "lang_default IN ('en','hi','te','ta','kn','mr','bn','gu','pa','ml','or')",
            name="ck_cities_lang_default",
        ),
        Index("idx_cities_slug", "slug"),
        Index("idx_cities_state", "state"),
    )
