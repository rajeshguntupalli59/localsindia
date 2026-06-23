"""add_retention_tables

Revision ID: bc67f85778f9
Revises: 169ed74e72b0
Create Date: 2026-06-23 11:07:54.429091

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'bc67f85778f9'
down_revision: Union[str, None] = '169ed74e72b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'saved_listings',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('listing_id', sa.UUID(), nullable=False),
        sa.Column('saved_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'listing_id', name='uq_saved_listings_user_listing'),
    )
    op.create_index('idx_saved_listings_user', 'saved_listings', ['user_id', 'saved_at'])

    op.create_table(
        'user_notifications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('body', sa.Text(), nullable=True),
        sa.Column('action_url', sa.String(500), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('listing_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['listing_id'], ['listings.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_user_notifications_user_read', 'user_notifications', ['user_id', 'is_read', 'created_at'])

    op.create_table(
        'user_preferences',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('interests', postgresql.ARRAY(sa.String(50)), nullable=True),
        sa.Column('budget_min', sa.Integer(), nullable=True),
        sa.Column('budget_max', sa.Integer(), nullable=True),
        sa.Column('city_prefs', postgresql.ARRAY(sa.String(100)), nullable=True),
        sa.Column('timeline', sa.String(30), nullable=True),
        sa.Column('alert_frequency', sa.String(20), nullable=False, server_default='never'),
        sa.Column('onboarding_done', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_user_preferences_user'),
    )


def downgrade() -> None:
    op.drop_table('user_preferences')
    op.drop_index('idx_user_notifications_user_read', table_name='user_notifications')
    op.drop_table('user_notifications')
    op.drop_index('idx_saved_listings_user', table_name='saved_listings')
    op.drop_table('saved_listings')
