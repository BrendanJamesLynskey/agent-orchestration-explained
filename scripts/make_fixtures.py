"""The site's parity fixtures, from the Python reference engine at the vendored commit.

    python scripts/make_fixtures.py          # write tests/fixtures/site_fixtures.json
    python scripts/make_fixtures.py --check  # fail if it is out of date (CI)

For every chapter (src/data/chapter_configs.json), everything it animates and quotes, computed by
the reference: each graph session's spec, layout and super-step frames (chapters 1 and 2), each
checkpoint session's timeline (chapter 3), and every durable-execution run the widget offers plus
the seeded charge sweeps (chapter 4); since engine 1.7, the patterns grid and the default task's
plans and frames (chapter 5), the fan-out studies (6), the reliability studies (7), the load sweep
and its detailed runs (8) and the chooser's tables (9). tests/unit/frames.test.ts recomputes them with the vendored
TS port (src/lib/engine's runChapter) and requires equality; tests/e2e/frames.spec.ts checks the
captions on the page.

The engine must be installed from git at the commit in src/lib/engine/vendor/VENDORED.json
(reference/requirements.txt pins it); this script refuses to run otherwise.
"""
from __future__ import annotations

import argparse
import importlib.metadata
import json
import sys
from pathlib import Path

from agent_loop_sim.orchestration import des as DES
from agent_loop_sim.orchestration import durable as D
from agent_loop_sim.orchestration import patterns as P
from agent_loop_sim.orchestration import study as S
from agent_loop_sim.orchestration import views as V
from agent_loop_sim.orchestration.scenarios import graph, session

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tests/fixtures/site_fixtures.json"


def installed_commit() -> str:
    d = importlib.metadata.distribution("agent-loop-sim")
    info = json.loads(d.read_text("direct_url.json") or "{}")
    return info.get("vcs_info", {}).get("commit_id", "")


def fault_params(fault: str, key: bool, choose: str) -> dict:
    p: dict = {"idempotency": key, "choose": choose}
    if fault == "crash_after_charge":
        p["crash"] = {"after_event": 4}
    elif fault == "crash_in_charge":
        p["crash"] = {"in_activity": "charge_card"}
    elif fault == "crash_in_ship":
        p["crash"] = {"in_activity": "ship_express"}
    elif fault == "lost_reply":
        p["lost"] = {"charge_card": [1]}
    return p


def graph_session(name: str) -> dict:
    s = session(name)
    g = graph(s["graph"])
    return {"name": name, "title": g["title"], "graph": g, "layout": V.layout(g),
            "supersteps": V.session_supersteps(g, s)[0]}


def run_chapter(chapter: str, cfg: dict) -> dict:
    if chapter == "patterns":
        d = cfg["default"]
        task = S.task_of(d["k"], d["result_tokens"])
        model = S.model_of(d["slope"])
        plans = {n: P.plan(n, task, model) for n in P.PATTERNS}
        return {"grid": S.patterns_grid(cfg["ks"], cfg["results"], cfg["slopes"]), "plans": plans,
                "frames": {n: P.pattern_frames(plans[n]) for n in P.PATTERNS}, "task": P.TASK, "model": P.MODEL}
    if chapter == "fanout":
        fans = []
        for it in cfg["itpm"]:
            f = S.fan_study(cfg["chunks"], cfg["chunk_tokens"], cfg["widths"], cfg["rpm"], it, cfg["otpm"])
            f.pop("plan")
            fans.append(f)
        return {"fans": fans, "plan": P.plan_map(cfg["chunks"], cfg["chunk_tokens"]), "session": graph_session("map_reduce")}
    if chapter == "reliability":
        return {"studies": [S.rel_study(cfg["e"], cfg["w"], c) for c in S.REL_CONFIGS], "rel": S.REL, "configs": S.REL_CONFIGS}
    if chapter == "scale":
        return {"sweep": S.scale_sweep(cfg["patterns"], cfg["rates"]),
                "details": {n: S.scale_detail(n, cfg["detail_rate"]) for n in cfg["patterns"]},
                "defaults": DES.DEFAULTS, "workflows": S.SCALE["workflows"], "seed": S.SCALE["seed"]}
    if chapter == "choose":
        return {"tables": {str(k): S.choose_table(k, r) for k, r in zip(cfg["k"], cfg["rates"])},
                "workflows": S.CHOOSE["workflows"]}
    if chapter in ("graph", "reducers"):
        return {"sessions": {n: graph_session(n) for n in cfg["sessions"]}}
    if chapter == "checkpoints":
        out = {}
        for n in cfg["sessions"]:
            s = session(n)
            g = graph(s["graph"])
            out[n] = {"name": n, "title": g["title"], "graph": g, "layout": V.layout(g), "timeline": V.timeline_frames(g, s)}
        return {"sessions": out}
    runs = {}
    for f in cfg["faults"]:
        for key in [False, True]:
            for choose in D.CHOOSE_MODES:
                runs[f"{f}|{'key' if key else 'nokey'}|{choose}"] = D.run_durable(fault_params(f, key, choose))
    sweeps = [D.charge_sweep(q, a, cfg["sweep_runs"], cfg["sweep_seed"]) for q in cfg["sweep_q"] for a in cfg["sweep_a"]]
    return {"workflow": D.WORKFLOW, "runs": runs, "sweeps": sweeps,
            "consts": {"timeout_ms": D.TIMEOUT_MS, "restart_ms": D.RESTART_MS}}


def build() -> str:
    vendored = json.loads((ROOT / "src/lib/engine/vendor/VENDORED.json").read_text())
    commit = installed_commit()
    if commit != vendored["commit"]:
        sys.exit(f"installed agent-loop-sim is at {commit[:7] or '?'}, the site vendors {vendored['commit'][:7]}: "
                 "pip install -r reference/requirements.txt")
    configs = json.loads((ROOT / "src/data/chapter_configs.json").read_text())
    out = {"commit": commit, "chapters": {ch: run_chapter(ch, cfg) for ch, cfg in configs.items()}}
    return json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    text = build()
    if a.check:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
            sys.exit("tests/fixtures/site_fixtures.json is out of date (run python scripts/make_fixtures.py)")
        print("site fixtures up to date")
    else:
        OUT.write_text(text, encoding="utf-8")
        print(f"wrote {OUT.relative_to(ROOT)} ({len(text)} bytes)")


if __name__ == "__main__":
    main()
