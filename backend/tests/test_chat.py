"""Chatbot endpoint tests — currently just the LLM usage-logging behavior
added alongside the admin spending dashboard. The endpoint had zero test
coverage before this; a full mock of Gemini's tool-calling loop is a
separate, larger undertaking (see backend/scripts/eval_chatbot.py for the
real-API eval harness instead)."""
import pytest
from unittest.mock import patch
from sqlalchemy import select, func

from app.models.llm_usage_log import LlmUsageLog


class _FakePart:
    def __init__(self, function_call=None):
        self.function_call = function_call


class _FakeContent:
    def __init__(self, parts):
        self.parts = parts


class _FakeCandidate:
    def __init__(self, parts):
        self.content = _FakeContent(parts)


class _FakeUsage:
    def __init__(self, input_tokens, output_tokens):
        self.prompt_token_count = input_tokens
        self.candidates_token_count = output_tokens


class _FakeResponse:
    def __init__(self, text, input_tokens, output_tokens):
        self.text = text
        self.candidates = [_FakeCandidate([_FakePart(function_call=None)])]
        self.usage_metadata = _FakeUsage(input_tokens, output_tokens)


class _FakeChatSession:
    def __init__(self, response):
        self._response = response

    def send_message(self, *args, **kwargs):
        return self._response


class _FakeChats:
    def __init__(self, response):
        self._response = response

    def create(self, **kwargs):
        return _FakeChatSession(self._response)


class _FakeGenaiClient:
    def __init__(self, response):
        self.chats = _FakeChats(response)


@pytest.mark.asyncio
async def test_chat_logs_llm_usage(client, db):
    """A successful chat reply (no tool call, plain FAQ-style answer)
    records one LlmUsageLog row with the real token counts and a computed
    cost - the actual blind spot this feature closes."""
    fake_response = _FakeResponse(text="Yes, it's completely free!", input_tokens=120, output_tokens=15)
    baseline = await db.scalar(select(func.count()).select_from(LlmUsageLog))

    with patch("app.core.config.settings.GOOGLE_AI_KEY", "fake-key-for-test"), \
         patch("app.routers.chat.genai.Client", return_value=_FakeGenaiClient(fake_response)):
        resp = await client.post("/api/v1/chat", json={"message": "is this app free?"})

    assert resp.status_code == 200
    assert resp.json()["reply"] == "Yes, it's completely free!"

    rows = (await db.execute(
        select(LlmUsageLog).order_by(LlmUsageLog.created_at.desc())
    )).scalars().all()
    assert len(rows) == baseline + 1
    row = rows[0]
    assert row.provider == "gemini"
    assert row.context == "chatbot"
    assert row.input_tokens == 120
    assert row.output_tokens == 15
    assert row.estimated_cost_usd > 0


@pytest.mark.asyncio
async def test_chat_without_api_key_does_not_log_usage(client, db):
    """The existing 'temporarily unavailable' fallback (no GOOGLE_AI_KEY)
    must not create a usage row - there was no real LLM call to bill for."""
    baseline = await db.scalar(select(func.count()).select_from(LlmUsageLog))

    with patch("app.core.config.settings.GOOGLE_AI_KEY", ""):
        resp = await client.post("/api/v1/chat", json={"message": "hello"})

    assert resp.status_code == 200
    after = await db.scalar(select(func.count()).select_from(LlmUsageLog))
    assert after == baseline
