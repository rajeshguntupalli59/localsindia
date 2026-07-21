"""add category detail tables

Revision ID: d3c3f83522ec
Revises: b4c5d6e7f8a9
Create Date: 2026-07-21 09:44:24.096892

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'd3c3f83522ec'
down_revision: Union[str, None] = 'b4c5d6e7f8a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('doctor_details',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('listing_id', sa.UUID(), nullable=False),
    sa.Column('specialization', sa.String(length=80), nullable=True),
    sa.Column('consultation_fee', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('available_timings', sa.String(length=100), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('listing_id')
    )
    op.create_table('education_details',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('listing_id', sa.UUID(), nullable=False),
    sa.Column('course_type', sa.String(length=60), nullable=True),
    sa.Column('mode', sa.String(length=20), nullable=True),
    sa.Column('duration', sa.String(length=50), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('listing_id')
    )
    op.create_table('electronics_details',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('listing_id', sa.UUID(), nullable=False),
    sa.Column('brand', sa.String(length=60), nullable=True),
    sa.Column('model', sa.String(length=60), nullable=True),
    sa.Column('condition', sa.String(length=20), nullable=True),
    sa.Column('warranty_remaining', sa.String(length=50), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('listing_id')
    )
    op.create_table('fashion_details',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('listing_id', sa.UUID(), nullable=False),
    sa.Column('brand', sa.String(length=60), nullable=True),
    sa.Column('size', sa.String(length=20), nullable=True),
    sa.Column('gender', sa.String(length=10), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('listing_id')
    )
    op.create_table('furniture_details',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('listing_id', sa.UUID(), nullable=False),
    sa.Column('material', sa.String(length=60), nullable=True),
    sa.Column('dimensions', sa.String(length=60), nullable=True),
    sa.Column('condition', sa.String(length=20), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('listing_id')
    )
    op.create_table('job_details',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('listing_id', sa.UUID(), nullable=False),
    sa.Column('company_name', sa.String(length=150), nullable=True),
    sa.Column('salary_min', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('salary_max', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('job_type', sa.String(length=20), nullable=True),
    sa.Column('experience_required', sa.String(length=50), nullable=True),
    sa.Column('work_mode', sa.String(length=20), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('listing_id')
    )
    op.create_table('pg_roommate_details',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('listing_id', sa.UUID(), nullable=False),
    sa.Column('room_type', sa.String(length=20), nullable=True),
    sa.Column('gender_preference', sa.String(length=10), nullable=True),
    sa.Column('deposit_amount', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('amenities', postgresql.ARRAY(sa.String(length=30)), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('listing_id')
    )
    op.create_table('real_estate_details',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('listing_id', sa.UUID(), nullable=False),
    sa.Column('property_type', sa.String(length=20), nullable=True),
    sa.Column('bhk', sa.Integer(), nullable=True),
    sa.Column('sqft', sa.Integer(), nullable=True),
    sa.Column('furnishing', sa.String(length=20), nullable=True),
    sa.Column('listing_type', sa.String(length=10), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('listing_id')
    )
    op.create_table('service_details',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('listing_id', sa.UUID(), nullable=False),
    sa.Column('service_type', sa.String(length=80), nullable=True),
    sa.Column('experience_years', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('listing_id')
    )
    op.create_table('tiffin_details',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('listing_id', sa.UUID(), nullable=False),
    sa.Column('meal_type', sa.String(length=20), nullable=True),
    sa.Column('delivery_area', sa.String(length=100), nullable=True),
    sa.Column('subscription_available', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('listing_id')
    )
    op.create_table('vehicle_details',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('listing_id', sa.UUID(), nullable=False),
    sa.Column('brand', sa.String(length=60), nullable=True),
    sa.Column('model', sa.String(length=60), nullable=True),
    sa.Column('year', sa.Integer(), nullable=True),
    sa.Column('km_driven', sa.Integer(), nullable=True),
    sa.Column('fuel_type', sa.String(length=20), nullable=True),
    sa.Column('transmission', sa.String(length=20), nullable=True),
    sa.Column('owners_count', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('listing_id')
    )


def downgrade() -> None:
    op.drop_table('vehicle_details')
    op.drop_table('tiffin_details')
    op.drop_table('service_details')
    op.drop_table('real_estate_details')
    op.drop_table('pg_roommate_details')
    op.drop_table('job_details')
    op.drop_table('furniture_details')
    op.drop_table('fashion_details')
    op.drop_table('electronics_details')
    op.drop_table('education_details')
    op.drop_table('doctor_details')
