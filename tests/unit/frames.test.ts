/**
 * Every chapter's data (src/lib/engine's runChapter, what the animations draw) equals what the
 * Python reference computes at the vendored commit (tests/fixtures/site_fixtures.json, regenerated
 * in CI from the reference installed at that commit), with no tolerance; and key frames say what the
 * chapters claim they say.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CHAPTER_CONFIGS,
  O,
  faultParams,
  runChapter,
  type Chapter,
  type Obj,
} from "@/lib/engine";

const fx = JSON.parse(
  readFileSync(join(__dirname, "../fixtures/site_fixtures.json"), "utf8"),
) as Obj;

describe("every chapter equals the Python reference", () => {
  for (const ch of Object.keys(CHAPTER_CONFIGS) as Chapter[])
    it(ch, () => expect(runChapter(ch)).toEqual(fx.chapters[ch]));
});

describe("key frames", () => {
  const g = runChapter("graph").sessions as Obj;
  const r = runChapter("reducers").sessions as Obj;
  const c = runChapter("checkpoints").sessions as Obj;
  const d = runChapter("durable") as Obj;

  it("fan-out: both researchers run in one super-step and their writes apply by name", () => {
    const frames = g.fanout.supersteps.frames as Obj[];
    const run = frames.find((f) => f.phase === "run" && f.step === 2)!;
    expect(run.active).toEqual(["web", "papers"]);
    const bar = frames.find((f) => f.phase === "barrier" && f.step === 2)!;
    expect((bar.writes as [string, Obj][]).map((w) => w[0])).toEqual([
      "papers",
      "web",
    ]);
    expect(frames[frames.length - 1]!.values.sources).toEqual([
      "papers",
      "web",
    ]);
  });

  it("graph time is the sum of each step's slowest node plus a checkpoint", () => {
    for (const s of Object.values(g) as Obj[]) {
      const ms: Record<string, number> = { __start__: 0 };
      for (const n of s.graph.nodes as Obj[]) ms[n.name] = n.ms;
      let t = 0;
      for (const f of s.supersteps.frames as Obj[])
        if (f.phase === "apply")
          t +=
            Math.max(...(f.active as string[]).map((n) => ms[n]!)) + O.CKPT_MS;
      expect(s.supersteps.graph_ms).toBe(t);
    }
  });

  it("no reducer: the second write fails and nothing is saved", () => {
    const frames = r.merge_overwrite.supersteps.frames as Obj[];
    const halt = frames[frames.length - 1]!;
    expect(halt.phase).toBe("halt");
    expect((halt.folds.answer as Obj[]).map((x) => x.error)).toEqual([
      false,
      true,
    ]);
    expect(halt.caption).toMatch(/InvalidUpdateError/);
  });

  it("add keeps both writes in name order; max keeps 42", () => {
    const add = r.merge_add.supersteps.frames as Obj[];
    expect(add[add.length - 1]!.values.answer).toEqual([42, 41]);
    const mx = r.merge_max.supersteps.frames as Obj[];
    expect(mx[mx.length - 1]!.values.answer).toBe(42);
  });

  it("the router does not see its sibling's write", () => {
    const frames = r.router_view.supersteps.frames as Obj[];
    const last = frames[frames.length - 1]!;
    expect(last.values.x).toBe(7);
    expect((last.fired as Obj[]).find((e) => e.from === "p")!.to).toBe(
      "__end__",
    );
  });

  it("an interrupted node runs again: its notification goes out twice", () => {
    const ops = c.approval.timeline.ops as Obj[];
    const eff = ops.flatMap((o) => o.effects as string[]);
    expect(eff.filter((e) => e === "ask:notify_reviewer")).toHaveLength(2);
    expect(ops[1]!.calls).toEqual(["ask", "send"]);
  });

  it("a crash keeps the sibling's pending writes", () => {
    const ops = c.crash.timeline.ops as Obj[];
    expect(ops[0]!.status).toBe("error");
    expect(ops[1]!.calls).toEqual(["enrich", "publish"]);
  });

  it("time travel: a fork checkpoint and a second branch", () => {
    const h = c.replay.timeline.ops[1].history as Obj[];
    expect(h.map((x) => x.source)).toContain("fork");
    const f = c.fork.timeline.ops[1].history as Obj[];
    expect(f[f.length - 1]!.source).toBe("update");
  });

  it("durable: a key turns two charges into one; a clock read breaks the replay", () => {
    expect(d.runs["crash_in_charge|nokey|marker"].charges).toBe(2);
    expect(d.runs["crash_in_charge|key|marker"].charges).toBe(1);
    expect(d.runs["lost_reply|nokey|marker"].charges).toBe(2);
    expect(d.runs["crash_in_ship|nokey|clock"].status).toBe("nondeterminism");
    expect(d.runs["crash_in_ship|nokey|marker"].status).toBe("completed");
    expect(d.runs["crash_after_charge|nokey|marker"].charges).toBe(1);
  });

  it("the sweep agrees with its closed form within four standard errors", () => {
    for (const s of d.sweeps as Obj[]) {
      const q = s.q as number;
      const sd = Math.sqrt(q / (1 - q) ** 2 / s.runs);
      expect(Math.abs(s.mean_no_key - s.expected_no_key)).toBeLessThanOrEqual(
        4 * sd + 1e-12,
      );
    }
  });

  it("fault parameters", () => {
    expect(faultParams("none", false, "clock")).toEqual({
      idempotency: false,
      choose: "clock",
    });
    expect(faultParams("crash_in_ship", true, "marker").crash).toEqual({
      in_activity: "ship_express",
    });
    expect(faultParams("lost_reply", true, "marker").lost).toEqual({
      charge_card: [1],
    });
  });
});
