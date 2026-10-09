import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Text, Index, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class ChatbotQuestion(Base):
    """One row per message a user sends to the chatbot, so admins can see
    what people actually ask (/admin/chatbot). The chat endpoint is public,
    so there is no user_id."""
    __tablename__ = "chatbot_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    city_slug: Mapped[str | None] = mapped_column(String(120), nullable=True)
    search_query: Mapped[str | None] = mapped_column(String(300), nullable=True)
    results_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_chatbot_questions_created", "created_at"),
    )
