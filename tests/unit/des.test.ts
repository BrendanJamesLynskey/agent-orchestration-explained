/**
 * The chapter 5–9 helpers (src/lib/orch/des.ts) against the engine: what each picture shows at a
 * moment is what the engine's plans, traces, series and runs say; and key frames say what the
 * chapters claim.
 */
import { describe, expect, it } from "vitest";

import { O, runChapter, type Obj } from "@/lib/engine";
import {
  SHORT,
  agentLabel,
  attemptState,
  changeAt,
  chooseFrames,
  durShort,
  finishedBy,
  gridAt,
  histogram,
  moments,
  nearestRank,
  stepSummary,
  tickStep,
  ticks,
  traceCounts,
} from "@/lib/orch/des";

describe("labels and axes", () => {
  it("agent labels", () => {
    expect(agentLabel("worker:pricing")).toBe("w·pricing");
    expect(agentLabel("worker:pricing", true)).toBe("w·pric");
    expect(agentLabel("worker:topic 12")).toBe("w12");
    expect(agentLabel("map:3")).toBe("map3");
    expect(agentLabel("lead:a")).toBe("lead a");
    expect(agentLabel("debater:2")).toBe("d2");
    expect(agentLabel("specialist:support")).toBe("s·support");
    expect(agentLabel("other:x")).toBe("other·x");
    expect(agentLabel("supervisor")).toBe("supervisor");
    expect(agentLabel("supervisor", true)).toBe("sup");
    expect(agentLabel("judge", true)).toBe("judge");
  });
  it("ticks", () => {
    expect(tickStep(0)).toBe(1);
    expect(tickStep(10, 5)).toBe(2);
    expect(tickStep(34.6, 6)).toBe(10);
    expect(tickStep(9.9, 1)).toBe(10);
    expect(ticks(34.6, 6)).toEqual([0, 10, 20, 30]);
    expect(moments(100, 4)).toEqual([0, 25, 50, 75, 100]);
  });
  it("short forms", () => {
    expect(Object.keys(SHORT)).toEqual(O.patterns.PATTERNS);
    expect(durShort(51700)).toBe("51.7 s");
    expect(durShort(192000)).toBe("3.2 min");
    expect(durShort(218889611)).toBe("60.8 h");
  });
});

describe("DES traces and series", () => {
  const fan = runChapter("fanout") as Obj;
  const f40 = (fan.fans as Obj[])[0]!;
  const run8 = (f40.runs as Obj[]).find((r) => r.width === 8)!;
  it("attempt states follow the trace", () => {
    const a = { queued: 10, start: 20, end: 30, outcome: "ok" };
    expect(attemptState(a, 5)).toBe("future");
    expect(attemptState(a, 15)).toBe("queued");
    expect(attemptState(a, 25)).toBe("running");
    expect(attemptState(a, 30)).toBe("done");
    expect(attemptState({ ...a, outcome: "error" }, 40)).toBe("failed");
    expect(attemptState({ ...a, start: null }, 40)).toBe("queued");
    expect(attemptState({ ...a, outcome: "tool" }, 40)).toBe("done");
  });
  it("counts at the end: every call done; never more running than the width", () => {
    const trace = run8.trace as Obj[];
    const end = traceCounts(trace, run8.ms);
    expect(end.done).toBe((fan.plan.calls as Obj[]).length);
    for (const t of moments(run8.ms, 60))
      expect(traceCounts(trace, t).running).toBeLessThanOrEqual(8);
    expect(traceCounts(trace, 0).queued + traceCounts(trace, 0).running).toBe(
      1,
    );
  });
  it("the step function agrees with the engine's resampled series", () => {
    const d = O.study.scaleDetail("supervisor", 3);
    const sim = O.des.simulate(O.patterns.plan("supervisor"), {
      ...O.study.scaleParams(3),
      trace: true,
      samples: 120,
    });
    expect(sim.series).toEqual(d.series);
    for (const s of d.series as Obj[]) {
      const r = changeAt(sim.changes, s.t);
      expect([r[1], r[2], r[3], r[4], r[5]]).toEqual([
        s.queue,
        s.inflight,
        s.insys,
        s.ok,
        s.bad,
      ]);
    }
    expect(changeAt([], 5)).toEqual([5, 0, 0, 0, 0, 0]);
  });
  it("percentiles and histograms of finished workflows", () => {
    const d = (runChapter("scale") as Obj).details.supervisor as Obj;
    const runs = d.runs as Obj[];
    const lat = finishedBy(runs, Infinity)
      .filter((r) => r.status !== "exhausted")
      .map((r) => r.end - r.arrival);
    expect(nearestRank(lat, 95)).toBe(d.p95);
    expect(nearestRank(lat, 50)).toBe(d.p50);
    expect(nearestRank([], 50)).toBe(0);
    const h = histogram(lat, Math.max(...lat), 20);
    expect(h.reduce((a, b) => a + b, 0)).toBe(lat.length);
    expect(histogram([-1, 5, 50], 10, 2)).toEqual([1, 2]);
    expect(finishedBy(runs, 0)).toEqual([]);
  });
});

describe("reliability grid", () => {
  const rel = runChapter("reliability") as Obj;
  const verify = (rel.studies as Obj[]).find((s) => s.name === "verify")!;
  const kept = verify.grid.kept as Obj[];
  it("the last step's survivors are the runs the engine scored ok", () => {
    const g = gridAt(kept, verify.grid.n);
    expect(g.alive).toBe(kept.filter((r) => r.status === "ok").length);
    expect(gridAt(kept, 0).alive).toBe(kept.length);
  });
  it("a run that gives up leaves its later steps empty", () => {
    const g = gridAt(
      [{ status: "gave_up", steps: [["ok"], ["error", "error", "error"]] }],
      3,
    );
    expect(g.cells[0]).toEqual(["ok", "gave_up", ""]);
    expect(g.tries[0]).toEqual([1, 3, 0]);
    expect(g.alive).toBe(0);
  });
  it("step summaries count every attempt", () => {
    const s = stepSummary(
      [
        { steps: [["error", "ok"]] },
        { steps: [["caught", "wrong"]] },
        { steps: [["error", "error", "rejected_ok"]] },
        { steps: [] },
      ],
      1,
    );
    expect(s).toEqual({
      reached: 3,
      error: 3,
      caught: 1,
      rejected_ok: 1,
      wrong: 1,
      ok: 1,
      gave_up: 1,
    });
  });
  it("retries beat one attempt and a verifier beats retries at ten steps (closed form and simulation)", () => {
    const at = (n: string) =>
      ((rel.studies as Obj[]).find((s) => s.name === n)!.curve as Obj[]).find(
        (c) => c.n === 10,
      )!;
    expect(at("retry").closed).toBeGreaterThan(at("none").closed);
    expect(at("verify").closed).toBeGreaterThan(at("retry").closed);
    for (const n of ["none", "retry", "verify"]) {
      const c = at(n);
      expect(c.ci[0]).toBeLessThanOrEqual(c.rate);
      expect(c.ci[1]).toBeGreaterThanOrEqual(c.rate);
    }
  });
});

describe("chooser frames", () => {
  const ch = runChapter("choose") as Obj;
  const table = ch.tables["16"] as Obj[];
  it("constraints strike patterns out one at a time, then the pick", () => {
    const r = O.study.choose(table, { success: 0.4, p95: 180000 });
    const frames = chooseFrames(
      r,
      table.map((x) => x.pattern),
    );
    expect(frames.map((f) => f.kind)).toEqual([
      "start",
      "constraint",
      "constraint",
      "pick",
    ]);
    expect(frames[frames.length - 1]!.pick).toBe("map_reduce");
    expect(frames[1]!.struck).toEqual(["single", "swarm", "debate"]);
    expect(frames[2]!.struck).toEqual([
      "single",
      "swarm",
      "debate",
      "supervisor",
      "hierarchical",
    ]);
  });
  it("no constraint: the most reliable pattern", () => {
    const r = O.study.choose(ch.tables["4"], {});
    expect(chooseFrames(r, []).length).toBe(2);
    expect(r.pick).toBe("debate");
  });
});

describe("patterns: key frames", () => {
  const p = runChapter("patterns") as Obj;
  it("the first frame is empty and the last has every call done", () => {
    for (const n of O.patterns.PATTERNS) {
      const fr = p.frames[n] as Obj[];
      expect(fr[0]!.done).toEqual([]);
      expect(fr[fr.length - 1]!.done.length).toBe(
        (p.plans[n].calls as Obj[]).length,
      );
      expect(fr[fr.length - 1]!.active).toEqual([]);
    }
  });
  it("map-reduce runs its workers at once; the supervisor one at a time", () => {
    const most = (n: string) =>
      Math.max(
        ...(p.frames[n] as Obj[]).map((f) => (f.active as number[]).length),
      );
    expect(most("supervisor")).toBe(1);
    expect(most("map_reduce")).toBe(4);
  });
  it("the cost so far ends at the plan's cost", () => {
    for (const n of O.patterns.PATTERNS) {
      const fr = p.frames[n] as Obj[];
      expect(fr[fr.length - 1]!.cost).toBeCloseTo(
        O.patterns.metrics(p.plans[n]).cost,
        12,
      );
    }
  });
});
