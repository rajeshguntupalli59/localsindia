import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Numeric, Integer, CheckConstraint, Index, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class LlmUsageLog(Base):
    """One row per LLM API call (currently: Gemini chat only - the marketing
    agents run on CI runners with no DB access, so their Claude usage is
    logged to a file in the repo instead and merged in at read time; see
    admin.py's activity-feed/llm-usage endpoints)."""
    __tablename__ = "llm_usage_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    context: Mapped[str | None] = mapped_column(String(50), nullable=True)
    input_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    output_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_cost_usd: Mapped[float] = mapped_column(Numeric(10, 6), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint("provider IN ('gemini','claude')", name="ck_llm_usage_logs_provider"),
        Index("idx_llm_usage_logs_created", "created_at"),
    )
