"""
Category-specific structured details for a listing.

Each table is a 1:1 extension of `listings` (one row per listing, only for
listings in that specific category) — real typed columns rather than a
flexible JSON blob, so Search can filter/sort on them directly later.
Classifieds/Businesses/Events are excluded: Classifieds is the deliberate
catch-all with no specific fields, Businesses/Events already have their own
dedicated tables (`businesses`, `events`) rather than a `listings` row.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Numeric, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class VehicleDetails(Base):
    __tablename__ = "vehicle_details"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    brand: Mapped[str | None] = mapped_column(String(60), nullable=True)
    model: Mapped[str | None] = mapped_column(String(60), nullable=True)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    km_driven: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fuel_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    transmission: Mapped[str | None] = mapped_column(String(20), nullable=True)
    owners_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class JobDetails(Base):
    __tablename__ = "job_details"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    company_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    salary_min: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    salary_max: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    job_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    experience_required: Mapped[str | None] = mapped_column(String(50), nullable=True)
    work_mode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class PgRoommateDetails(Base):
    __tablename__ = "pg_roommate_details"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    room_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    gender_preference: Mapped[str | None] = mapped_column(String(10), nullable=True)
    deposit_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    amenities: Mapped[list[str] | None] = mapped_column(ARRAY(String(30)), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class RealEstateDetails(Base):
    __tablename__ = "real_estate_details"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    property_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    bhk: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sqft: Mapped[int | None] = mapped_column(Integer, nullable=True)
    furnishing: Mapped[str | None] = mapped_column(String(20), nullable=True)
    listing_type: Mapped[str | None] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ElectronicsDetails(Base):
    __tablename__ = "electronics_details"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    brand: Mapped[str | None] = mapped_column(String(60), nullable=True)
    model: Mapped[str | None] = mapped_column(String(60), nullable=True)
    condition: Mapped[str | None] = mapped_column(String(20), nullable=True)
    warranty_remaining: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class FurnitureDetails(Base):
    __tablename__ = "furniture_details"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    material: Mapped[str | None] = mapped_column(String(60), nullable=True)
    dimensions: Mapped[str | None] = mapped_column(String(60), nullable=True)
    condition: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class FashionDetails(Base):
    __tablename__ = "fashion_details"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    brand: Mapped[str | None] = mapped_column(String(60), nullable=True)
    size: Mapped[str | None] = mapped_column(String(20), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class EducationDetails(Base):
    __tablename__ = "education_details"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    course_type: Mapped[str | None] = mapped_column(String(60), nullable=True)
    mode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    duration: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class DoctorDetails(Base):
    __tablename__ = "doctor_details"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    specialization: Mapped[str | None] = mapped_column(String(80), nullable=True)
    consultation_fee: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    available_timings: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ServiceDetails(Base):
    __tablename__ = "service_details"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    service_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    experience_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class TiffinDetails(Base):
    __tablename__ = "tiffin_details"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("listings.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    meal_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    delivery_area: Mapped[str | None] = mapped_column(String(100), nullable=True)
    subscription_available: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# category_slug -> model, used by routers/listings.py to persist/fetch the
# right detail row without a long if/elif chain.
DETAILS_BY_CATEGORY_SLUG: dict[str, type[Base]] = {
    "vehicles": VehicleDetails,
    "jobs": JobDetails,
    "pg-roommate": PgRoommateDetails,
    "real-estate": RealEstateDetails,
    "electronics": ElectronicsDetails,
    "furniture": FurnitureDetails,
    "fashion": FashionDetails,
    "education": EducationDetails,
    "doctors": DoctorDetails,
    "services": ServiceDetails,
    "tiffin": TiffinDetails,
}
