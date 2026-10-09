"""add chatbot_questions table

Revision ID: c7d8e9f0a1b2
Revises: d1e2f3a4b5c6
Create Date: 2026-10-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c7d8e9f0a1b2'
down_revision: Union[str, None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('chatbot_questions',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('question', sa.Text(), nullable=False),
    sa.Column('city_slug', sa.String(length=120), nullable=True),
    sa.Column('search_query', sa.String(length=300), nullable=True),
    sa.Column('results_count', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_chatbot_questions_created', 'chatbot_questions', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_chatbot_questions_created', table_name='chatbot_questions')
    op.drop_table('chatbot_questions')
