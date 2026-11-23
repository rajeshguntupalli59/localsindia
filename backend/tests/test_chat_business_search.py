"""The chatbot can search the business directory (doctors, shops, services),
not just classified ads — search_svc.search_businesses + the Gemini tool."""
import uuid
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker

from tests.conftest import _make_engine


async def _add(*objs):
    engine = _make_engine()
    async with async_sessionmaker(engine, expire_on_commit=False)() as s:
        for o in objs:
            s.add(o)
        await s.commit()
    await engine.dispose()
    return objs[0] if len(objs) == 1 else objs


@pytest_asyncio.fixture
async def town():
    from app.models.city import City
    tag = uuid.uuid4().hex[:6]
    return await _add(City(name=f"Town {tag}", state="Test", slug=f"town-{tag}", lang_default="en"))


async def _biz(city, name, sub=None, **kw):
    from app.models.business import Business
    return await _add(Business(city_id=city.id, name=name, subcategory_slug=sub, **kw))


async def _search(city, **kw):
    from app.services.search_svc import search_businesses
    engine = _make_engine()
    async with async_sessionmaker(engine, expire_on_commit=False)() as s:
        items, total = await search_businesses(s, city_id=city.id, **kw)
    await engine.dispose()
    return [b.name for b in items], total


@pytest.mark.asyncio
async def test_finds_by_type_not_just_name(town):
    await _biz(town, "Smile Clinic", sub="dentists")
    await _biz(town, "City Hospital", sub="hospitals")
    names, total = await _search(town, type="dentists")
    assert names == ["Smile Clinic"] and total == 1


@pytest.mark.asyncio
async def test_name_words_all_must_match(town):
    await _biz(town, "Apollo Dental Care", sub="dentists")
    await _biz(town, "Apollo Pharmacy", sub="pharmacies")
    assert (await _search(town, name="apollo dental"))[0] == ["Apollo Dental Care"]


@pytest.mark.asyncio
async def test_area_matches_locality(town):
    await _biz(town, "A Clinic", sub="dentists", locality="Madhapur")
    await _biz(town, "B Clinic", sub="dentists", locality="Ameerpet")
    assert (await _search(town, type="dentists", area="madhapur"))[0] == ["A Clinic"]


@pytest.mark.asyncio
async def test_other_city_and_deleted_are_skipped(town):
    from app.models.city import City
    other = await _add(City(name="Elsewhere", state="T", slug=f"else-{uuid.uuid4().hex[:6]}", lang_default="en"))
    await _biz(other, "Far Clinic", sub="dentists")
    await _biz(town, "Closed Clinic", sub="dentists", deleted_at=datetime.now(timezone.utc))
    assert await _search(town, type="dentists") == ([], 0)


@pytest.mark.asyncio
async def test_contactable_first_and_limited(town):
    await _biz(town, "Aaa No Phone", sub="dentists")
    await _biz(town, "Zzz Has Phone", sub="dentists", phone="+919876543210")
    for i in range(6):
        await _biz(town, f"Extra {i}", sub="dentists")
    names, total = await _search(town, type="dentists", limit=5)
    assert names[0] == "Zzz Has Phone" and len(names) == 5 and total == 8


@pytest.mark.asyncio
async def test_no_filters_returns_nothing(town):
    await _biz(town, "Anything", sub="dentists")
    assert await _search(town) == ([], 0)   # never dump a whole city


# ── chat endpoint: Gemini calls search_businesses ───────────────────────────

class _Call:
    def __init__(self, name, args):
        self.name, self.args = name, args


class _Part:
    def __init__(self, function_call=None):
        self.function_call = function_call


class _Resp:
    def __init__(self, text=None, call=None):
        self.text = text
        self.candidates = [type("C", (), {"content": type("X", (), {"parts": [_Part(call)]})()})()]
        self.usage_metadata = None


class _Session:
    def __init__(self, script):
        self.script, self.sent = list(script), []

    def send_message(self, msg, *a, **k):
        self.sent.append(msg)
        return self.script.pop(0)


class _Client:
    def __init__(self, session):
        self.chats = type("Chats", (), {"create": lambda _self, **k: session})()


@pytest.mark.asyncio
async def test_chat_returns_business_cards(client, town):
    await _biz(town, "Smile Clinic", sub="dentists", locality="Madhapur", phone="+919876543210")
    session = _Session([
        _Resp(call=_Call("search_businesses", {"city_slug": town.slug, "type": "dentists"})),
        _Resp(text="Here are dentists I found."),
    ])
    with patch("app.core.config.settings.GOOGLE_AI_KEY", "fake"), \
         patch("app.routers.chat.genai.Client", return_value=_Client(session)):
        r = await client.post("/api/v1/chat", json={"message": "dentists", "city_slug": town.slug})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["reply"] == "Here are dentists I found."
    assert data["listings"] is None
    b = data["businesses"][0]
    assert (b["name"], b["locality"], b["phone"], b["city_slug"], b["type_name"]) == \
        ("Smile Clinic", "Madhapur", "+919876543210", town.slug, "Dentists")
    # the tool result handed back to Gemini names the business
    assert "Smile Clinic" in str(session.sent[1])


@pytest.mark.asyncio
async def test_chat_logs_business_search(client, db, town):
    from sqlalchemy import select
    from app.models.chatbot_question import ChatbotQuestion
    session = _Session([
        _Resp(call=_Call("search_businesses", {"city_slug": town.slug, "type": "dentists"})),
        _Resp(text="None found."),
    ])
    msg = f"dentists please {uuid.uuid4().hex[:6]}"
    with patch("app.core.config.settings.GOOGLE_AI_KEY", "fake"), \
         patch("app.routers.chat.genai.Client", return_value=_Client(session)):
        await client.post("/api/v1/chat", json={"message": msg, "city_slug": town.slug})
    row = (await db.execute(select(ChatbotQuestion).where(ChatbotQuestion.question == msg))).scalar_one()
    assert row.results_count == 0 and row.search_query == "dentists"


@pytest.mark.asyncio
async def test_markdown_bold_is_removed_from_reply(client, town):
    session = _Session([_Resp(text="I found **37 dentists**. Try __Smile Clinic__ – **Madhapur**.")])
    with patch("app.core.config.settings.GOOGLE_AI_KEY", "fake"), \
         patch("app.routers.chat.genai.Client", return_value=_Client(session)):
        r = await client.post("/api/v1/chat", json={"message": "dentists", "city_slug": town.slug})
    assert r.json()["reply"] == "I found 37 dentists. Try Smile Clinic – Madhapur."
