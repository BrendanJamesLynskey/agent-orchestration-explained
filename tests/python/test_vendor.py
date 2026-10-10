"""The vendored engine files are the engine repository's files at the pinned commit, the reference
installed at that commit reproduces the engine's orchestration fixtures, and the committed LangGraph
recording equals the reference runtime (the engine's own CI re-records it live in langgraph)."""
from __future__ import annotations

import hashlib
import importlib.metadata
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
VENDORED = json.loads((ROOT / "src/lib/engine/vendor/VENDORED.json").read_text())


def test_every_vendored_file_matches_its_hash():
    assert len(VENDORED["files"]) >= 40
    for path, rec in VENDORED["files"].items():
        assert hashlib.sha256((ROOT / path).read_bytes()).hexdigest() == rec["sha256"], path


def test_installed_reference_is_the_vendored_commit():
    d = importlib.metadata.distribution("agent-loop-sim")
    assert json.loads(d.read_text("direct_url.json"))["vcs_info"]["commit_id"] == VENDORED["commit"]


def test_the_reference_reproduces_the_engine_fixtures():
    from agent_loop_sim.orchestration import durable as D
    from agent_loop_sim.orchestration.graph import run_session
    from agent_loop_sim.orchestration.scenarios import graph, session

    fx = json.loads((ROOT / "tests/fixtures/orchestration_fixtures.json").read_text())
    for s in fx["sessions"]:
        assert run_session(graph(s["graph"]), session(s["name"])["ops"])["ops"] == s["ops"], s["name"]
    for name, r in fx["durable"].items():
        assert D.run_durable(D.scenario(name)["params"]) == r, name


def test_the_langgraph_recording_equals_the_reference():
    from agent_loop_sim.orchestration.graph import comparable_history, outcome, run_session
    from agent_loop_sim.orchestration.scenarios import graph, session

    rec = json.loads((ROOT / "src/data/langgraph_recordings.json").read_text())
    assert rec["langgraph"] == "1.2.14"
    for s in rec["sessions"]:
        g = graph(s["graph"])
        r = run_session(g, session(s["name"])["ops"])
        for mine, theirs in zip(r["ops"], s["ops"]):
            assert outcome(mine["result"]) == theirs["outcome"], s["name"]
            assert comparable_history(g, mine["history"]) == theirs["history"], s["name"]
