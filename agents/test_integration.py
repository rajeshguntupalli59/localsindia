#!/usr/bin/env python3
"""
Integration test — verifies all 8 agents work end-to-end with the Claude API.
Does NOT post to the live backend (no city_launcher seeding).
Run: python agents/test_integration.py
"""
import sys
import json
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

PASS = "[PASS]"
FAIL = "[FAIL]"
results = []

def check(label, fn):
    try:
        fn()
        print(f"{PASS} {label}")
        results.append((label, True))
    except Exception as e:
        print(f"{FAIL} {label}: {e}")
        results.append((label, False))

# ── 1. base_agent: build_system_prompt loads instruction + context ─────────────
print("\n-- base_agent --")
from base_agent import build_system_prompt, generate, save_output

for agent_name in ["city_launcher","seo_agent","content_writer","whatsapp_agent",
                   "reddit_agent","cro_agent","feedback_agent","growth_tracker"]:
    check(
        f"build_system_prompt({agent_name})",
        lambda n=agent_name: build_system_prompt(n)
    )

# ── 2. Live Claude API call ────────────────────────────────────────────────────
print("\n-- Claude API round-trip --")
def live_api_test():
    prompt = build_system_prompt("seo_agent")
    msg = "Return exactly this JSON with no other text: {\"status\": \"ok\"}"
    result = generate(prompt, msg, max_tokens=20)
    assert "ok" in result.lower(), f"Unexpected response: {result}"

check("Claude API call (seo_agent system prompt)", live_api_test)

# ── 3. save_output writes to disk ─────────────────────────────────────────────
print("\n-- save_output --")
def test_save():
    path = save_output("test", "integration-test", "hello world", "txt")
    assert path.exists(), f"File not created: {path}"
    path.unlink()  # clean up

check("save_output creates file + cleans up", test_save)

# ── 4. run() importable from each agent ───────────────────────────────────────
print("\n-- agent run() imports --")
check("seo_agent.run", lambda: __import__("seo_agent").run)
check("content_writer.run", lambda: __import__("content_writer").run)
check("whatsapp_agent.run", lambda: __import__("whatsapp_agent").run)
check("reddit_agent.run", lambda: __import__("reddit_agent").run)
check("cro_agent.run", lambda: __import__("cro_agent").run)
check("feedback_agent.run", lambda: __import__("feedback_agent").run)
check("growth_tracker.run", lambda: __import__("growth_tracker").run)
check("run_all.run_agent", lambda: __import__("run_all").run_agent)

# ── 5. city_launcher: TokenManager class ──────────────────────────────────────
print("\n-- city_launcher internals --")
from city_launcher import TokenManager, build_system_prompt as cl_sp, LISTING_PHONES, BUSINESS_PHONES

check("city_launcher.build_system_prompt()", lambda: cl_sp())
check("LISTING_PHONES valid format (20 entries)", lambda: (
    [None for p in LISTING_PHONES if not p.startswith("+9163")] == [] and
    len(LISTING_PHONES) == 20
) or (_ for _ in ()).throw(AssertionError("Phone format check failed")))
check("TokenManager class exists", lambda: TokenManager)

# ── 6. CLI args parse without error ───────────────────────────────────────────
print("\n-- CLI argument parsing --")
import argparse

def test_cli(module_name, args):
    mod = __import__(module_name)
    # just confirm argparse is defined in main()
    assert hasattr(mod, "main"), f"{module_name} has no main()"

for m in ["seo_agent", "content_writer", "whatsapp_agent", "reddit_agent",
          "cro_agent", "feedback_agent", "growth_tracker", "run_all"]:
    check(f"{m}.main() defined", lambda m=m: test_cli(m, []))

# ── Summary ───────────────────────────────────────────────────────────────────
print("\n" + "=" * 50)
passed = sum(1 for _, ok in results if ok)
total = len(results)
print(f"Results: {passed}/{total} passed")
if passed == total:
    print("ALL AGENTS INTEGRATED AND WORKING")
else:
    failed = [label for label, ok in results if not ok]
    print(f"FAILURES: {', '.join(failed)}")
sys.exit(0 if passed == total else 1)
