/**
 * The small modules around the engine: number formats, node states, timeline lanes, history
 * labels, the palette, the chapter catalogue and the site constants.
 */
import { describe, expect, it } from "vitest";

import { O, runChapter, type Obj } from "@/lib/engine";
import {
  clip,
  fmtInt,
  fmtMs,
  fmtTokens,
  fmtUsd,
  pct,
  trim,
} from "@/lib/format";
import {
  SECTIONS,
  getSectionMeta,
  isValidSlug,
  readSectionMdx,
} from "@/lib/mdx/sections";
import {
  checkpointStates,
  eventLabel,
  firedEdges,
  lanes,
  superstepStates,
} from "@/lib/orch/states";
import { GITHUB_URL, SITE_URL, repoFile } from "@/lib/site";
import {
  BRANCH_COLOUR,
  EVENT_COLOUR,
  SOURCE_COLOUR,
  STATE_COLOUR,
  nodeColour,
} from "@/lib/viz/palette";

describe("format", () => {
  it("durations", () => {
    expect(fmtMs(0)).toBe("0 s");
    expect(fmtMs(850)).toBe("850 ms");
    expect(fmtMs(12345)).toBe("12.3 s");
    expect(fmtMs(125_000)).toBe("2 min 5 s");
    expect(fmtMs(119_800)).toBe("2 min 0 s");
  });
  it("money, counts, percentages, clipping", () => {
    expect(fmtUsd(0)).toBe("$0");
    expect(fmtUsd(0.00236)).toBe("$0.00236");
    expect(fmtUsd(1.234)).toBe("$1.23");
    expect(fmtTokens(4342)).toBe("4,342 tokens");
    expect(fmtInt(1234.4)).toBe("1,234");
    expect(pct(0.531)).toBe("53%");
    expect(trim(0)).toBe("0");
    expect(clip("short")).toBe("short");
    expect(clip("a few words that will not fit in the space", 20)).toBe(
      "a few words that…",
    );
    expect(clip("abcdefghijklmnopqrstuvwxyz", 10)).toBe("abcdefghi…");
  });
});

describe("node states", () => {
  const g = runChapter("graph").sessions as Obj;
  const r = runChapter("reducers").sessions as Obj;
  const c = runChapter("checkpoints").sessions as Obj;
  it("super-steps: running, done, next, waiting at a join", () => {
    const fr = g.fanout.supersteps.frames as Obj[];
    const run = fr.findIndex((f) => f.phase === "run" && f.step === 2);
    expect(superstepStates(fr, run)).toMatchObject({
      plan: "done",
      web: "active",
      papers: "active",
    });
    const ap = fr.findIndex((f) => f.phase === "apply" && f.step === 1);
    expect(superstepStates(fr, ap)).toMatchObject({
      plan: "done",
      web: "next",
      papers: "next",
    });
    expect(firedEdges(fr[ap]!)).toEqual(["plan>web", "plan>papers"]);
    expect(firedEdges(fr[run]!)).toEqual([]);
    const lj = g.loop_join.supersteps.frames as Obj[];
    expect(superstepStates(lj, 0)).toEqual({});
  });
  it("halts: a conflict marks both writers failed", () => {
    const fr = r.merge_overwrite.supersteps.frames as Obj[];
    expect(superstepStates(fr, fr.length - 1)).toMatchObject({
      fast: "failed",
      careful: "failed",
    });
  });
  it("halts: a crash fails one node and keeps its sibling; an interrupt pauses", () => {
    const cr = O.sessionSupersteps(O.graph("crash"), O.session("crash"))[0]!
      .frames as Obj[];
    expect(superstepStates(cr, cr.length - 1)).toMatchObject({
      enrich: "failed",
      score: "done",
    });
    const ap = O.sessionSupersteps(
      O.graph("approval"),
      O.session("approval"),
    )[0]!.frames as Obj[];
    expect(superstepStates(ap, ap.length - 1)).toMatchObject({
      ask: "paused",
      check: "done",
    });
  });
  it("a waiting join target is hatched, not 'next'", () => {
    const sess = runChapter("graph").sessions as Obj;
    // build a frame by hand: the join into e still waits for c
    const frame = {
      phase: "apply",
      active: ["b", "d"],
      next: ["c", "e"],
      fired: [
        { from: "d", to: "e", kind: "join", waiting: ["c"] },
        { from: "b", to: "c", kind: "edge" },
      ],
      values: {},
    };
    expect(superstepStates([frame], 0)).toMatchObject({
      b: "done",
      d: "done",
      c: "next",
      e: "waiting",
    });
    expect(Object.keys(sess)).toHaveLength(4);
  });
  it("checkpoints: failed, paused, done and next", () => {
    const crash = c.crash.timeline.ops as Obj[];
    expect(checkpointStates(crash[0]!.history, 2)).toMatchObject({
      load: "done",
      enrich: "failed",
      score: "done",
    });
    expect(checkpointStates(crash[1]!.history, 2)).toMatchObject({
      enrich: "done",
    });
    const ap = c.approval.timeline.ops as Obj[];
    expect(checkpointStates(ap[0]!.history, 2)).toMatchObject({
      ask: "paused",
      check: "done",
    });
    expect(checkpointStates(ap[0]!.history, 1)).toMatchObject({
      draft: "done",
    });
    expect(checkpointStates(ap[0]!.history, 1, true)).toMatchObject({
      draft: "next",
    });
    expect(checkpointStates(ap[0]!.history, null)).toEqual({});
    const gated = c.gated_edit.timeline.ops[0].history as Obj[];
    expect(checkpointStates(gated, 2)).toMatchObject({
      planner: "done",
      execute: "next",
    });
  });
  it("lanes: a fork starts a new lane", () => {
    const h = c.replay.timeline.ops[1].history as Obj[];
    const l = lanes(h);
    expect(l[0]).toBe(0);
    expect(l[4]).toBe(0);
    expect(l[5]).toBe(1);
    expect(l[7]).toBe(1);
  });
  it("history labels", () => {
    const h = runChapter("durable").runs["lost_reply|nokey|marker"]
      .history as Obj[];
    expect(h.map((e) => eventLabel(e, h))).toEqual([
      "workflow started",
      "scheduled reserve_stock",
      "completed reserve_stock (done)",
      "scheduled charge_card",
      "timed out charge_card (attempt 1)",
      "completed charge_card (charged)",
      "marker shipping = standard",
      "scheduled ship_standard",
      "completed ship_standard (done)",
      "scheduled send_receipt",
      "completed send_receipt (sent)",
      "workflow completed",
    ]);
    expect(eventLabel({ type: "activity_failed", seq: 9 }, h)).toBe("failed ?");
  });
});

describe("palette", () => {
  it("every source, event and state has a colour", () => {
    for (const m of [SOURCE_COLOUR, EVENT_COLOUR, STATE_COLOUR])
      for (const v of Object.values(m)) expect(v).toMatch(/^#[0-9A-F]{6}$/);
    expect(nodeColour(["a", "b"], "b")).toBe(BRANCH_COLOUR[1]);
    expect(nodeColour(["a"], "z")).toMatch(/^#/);
  });
});

describe("chapters and site", () => {
  it("catalogue", async () => {
    expect(SECTIONS).toHaveLength(4);
    expect(isValidSlug("02-state-channels-and-reducers")).toBe(true);
    expect(isValidSlug("99-nope")).toBe(false);
    expect(getSectionMeta("04-durable-execution").title).toBe(
      "Durable execution",
    );
    expect(await readSectionMdx("01-from-a-chain-to-a-graph")).toMatch(
      /^<GraphWidget>/,
    );
  });
  it("constants", () => {
    expect(SITE_URL).toBe("https://agent-orchestration-explained.vercel.app");
    expect(repoFile("README.md")).toBe(`${GITHUB_URL}/blob/main/README.md`);
  });
});
