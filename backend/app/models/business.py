import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Boolean, Integer, Numeric, ForeignKey, Index, DateTime, case, exists, func, or_
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
from app.models.business_image import BusinessImage


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
    # Where an admin-imported business came from, e.g. source='osm',
    # source_ref='node/123456' — lets re-runs skip what's already imported and
    # lets the site show the OpenStreetMap attribution the ODbL licence requires.
    source: Mapped[str | None] = mapped_column(String(20), nullable=True)
    source_ref: Mapped[str | None] = mapped_column(String(40), nullable=True, unique=True)
    latitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    # Neighbourhood/suburb from OpenStreetMap place nodes (nearest to the
    # business's coordinates) — set by agents/assign_localities.py; powers the
    # /[city]/area/[area] and /[city]/[category]/[area] pages.
    locality: Mapped[str | None] = mapped_column(String(80), nullable=True)
    locality_slug: Mapped[str | None] = mapped_column(String(90), nullable=True)
    # OpenStreetMap opening_hours syntax, e.g. "Mo-Sa 09:00-21:00; Su off" —
    # nearly the same as schema.org openingHours, so it goes into JSON-LD as is.
    opening_hours: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Subcategory within category_id, e.g. 'hospitals' under doctors — slugs
    # are defined in app/core/category_catalog.py.
    subcategory_slug: Mapped[str | None] = mapped_column(String(60), nullable=True, index=True)
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
    category: Mapped["Category | None"] = relationship("Category", lazy="selectin")
    city: Mapped["City"] = relationship("City", lazy="selectin")

    @property
    def category_slug(self) -> str | None:
        # Lets the frontend pick the category cover photo without a second lookup
        return self.category.slug if self.category else None

    @property
    def city_slug(self) -> str | None:
        # Lets the apps build the business's public page URL (/{city}/businesses/{id})
        return self.city.slug if self.city else None

    # Worth asking Google to index: real owner/user content, or at least two of
    # phone / opening hours / website. Bare OpenStreetMap imports (name +
    # address) are thin, widely duplicated pages — they stay live but get
    # noindex and are left out of sitemap.xml. Python and SQL forms must agree.
    @hybrid_property
    def indexable(self) -> bool:
        if (self.owner_id or self.review_count or (self.description or "").strip()
                or self.source != "osm" or any("placehold.co" not in i.url for i in self.images)):
            return True
        return sum(bool((v or "").strip()) for v in (self.phone, self.opening_hours, self.website_url)) >= 2

    @indexable.inplace.expression
    @classmethod
    def _indexable_expression(cls):
        def filled(col):
            return case((func.coalesce(func.trim(col), "") != "", 1), else_=0)
        return or_(
            cls.owner_id.is_not(None),
            cls.review_count > 0,
            func.coalesce(func.trim(cls.description), "") != "",
            cls.source.is_distinct_from("osm"),
            exists().where(BusinessImage.business_id == cls.id, ~BusinessImage.url.contains("placehold.co")),
            filled(cls.phone) + filled(cls.opening_hours) + filled(cls.website_url) >= 2,
        )

    __table_args__ = (
        Index("idx_businesses_city", "city_id", "category_id"),
        Index("idx_businesses_owner", "owner_id"),
        Index("idx_businesses_locality", "city_id", "locality_slug"),
    )
