"""Shared Claude API helper for all LocalIndia marketing agents."""
import os
import json
from datetime import datetime
from pathlib import Path

import anthropic

MODEL = "claude-haiku-4-5-20251001"
OUTPUT_DIR = Path(__file__).parent / "output"
INSTRUCTIONS_DIR = Path(__file__).parent / "instructions"
CONTEXT_FILE = Path(__file__).parent / "context" / "product_context.md"


def get_client() -> anthropic.Anthropic:
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY env var not set")
    return anthropic.Anthropic(api_key=key)


def generate(system_prompt: str, user_message: str, max_tokens: int = 4096) -> str:
    client = get_client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text


def save_output(agent_name: str, city_slug: str, content: str, suffix: str = "md") -> Path:
    folder = OUTPUT_DIR / city_slug
    folder.mkdir(parents=True, exist_ok=True)
    date = datetime.now().strftime("%Y-%m-%d_%H%M")
    path = folder / f"{agent_name}_{date}.{suffix}"
    path.write_text(content, encoding="utf-8")
    return path


def load_context() -> str:
    """Returns the shared product context (what LocalIndia is, categories, voice, etc.)"""
    return CONTEXT_FILE.read_text(encoding="utf-8")


def load_instructions(agent_name: str) -> str:
    """Returns the agent's instruction file from agents/instructions/{agent_name}.md"""
    path = INSTRUCTIONS_DIR / f"{agent_name}.md"
    if not path.exists():
        raise FileNotFoundError(f"No instruction file found: {path}")
    return path.read_text(encoding="utf-8")


def build_system_prompt(agent_name: str) -> str:
    """Combines agent instructions + shared product context into a full system prompt."""
    instructions = load_instructions(agent_name)
    context = load_context()
    return f"{instructions}\n\n---\n\n## Shared Product Context\n\n{context}"
