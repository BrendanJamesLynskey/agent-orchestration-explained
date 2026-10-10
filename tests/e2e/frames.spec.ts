/**
 * Frame tests on the page (visual standard §4): set key frames of every animation and require
 * the caption on screen to be the caption of the Python reference's frame
 * (tests/fixtures/site_fixtures.json): the engine writes the captions, in both languages.
 */
import { expect, test, type Locator } from "@playwright/test";

import fx from "../fixtures/site_fixtures.json";

import type { Obj } from "@/lib/engine";
import { fmtMs, fmtUsd, pct } from "@/lib/format";

import { ENGINE_TIMEOUT } from "./pages";

// No autoplay (reduced motion): the test sets each frame itself.
test.use({ contextOptions: { reducedMotion: "reduce" } });

const CH = (fx as Obj).chapters as Obj;

async function change(fig: Locator, act: () => Promise<void>): Promise<void> {
  const before = (await fig.getAttribute("data-key")) ?? "";
  await act();
  await expect(fig).not.toHaveAttribute("data-key", before);
}

async function frame(fig: Locator, i: number, want: string): Promise<void> {
  await fig.getByTestId("scrub").fill(String(i));
  await expect(fig).toHaveAttribute("data-step", String(i));
  await expect(fig.getByTestId("caption")).toHaveText(want);
}

function keySteps(n: number): number[] {
  return [...new Set([0, 1, Math.floor(n / 2), n - 1])];
}

type Case = {
  path: string;
  id: string;
  name: string;
  captions: string[];
  choose?: (fig: Locator) => Promise<void>;
};

const radio =
  (...names: string[]) =>
  async (fig: Locator) => {
    for (const n of names)
      await change(fig, async () => {
        await fig.getByRole("radio", { name: n, exact: true }).click();
      });
  };

const caps = (frames: Obj[]) => frames.map((f) => f.caption as string);
const P1 = "/learn/01-from-a-chain-to-a-graph";
const P2 = "/learn/02-state-channels-and-reducers";
const P3 = "/learn/03-checkpoints-and-interrupts";
const P4 = "/learn/04-durable-execution";
const P5 = "/learn/05-multi-agent-patterns";
const timed = (frames: Obj[]) =>
  frames.map((f) => `${fmtMs(f.t)}: ${f.caption}`);

const CASES: Case[] = [
  {
    path: P1,
    id: "graph-widget",
    name: "fan-out",
    captions: caps(CH.graph.sessions.fanout.supersteps.frames),
  },
  {
    path: P1,
    id: "graph-widget",
    name: "agent loop",
    captions: caps(CH.graph.sessions.react_loop.supersteps.frames),
    choose: radio("agent loop"),
  },
  {
    path: P2,
    id: "reducer-widget",
    name: "add",
    captions: caps(CH.reducers.sessions.merge_add.supersteps.frames),
  },
  {
    path: P2,
    id: "reducer-widget",
    name: "no reducer",
    captions: caps(CH.reducers.sessions.merge_overwrite.supersteps.frames),
    choose: radio("no reducer"),
  },
  {
    path: P3,
    id: "checkpoint-widget",
    name: "crash",
    captions: caps(CH.checkpoints.sessions.crash.timeline.frames),
  },
  {
    path: P3,
    id: "checkpoint-widget",
    name: "replay",
    captions: caps(CH.checkpoints.sessions.replay.timeline.frames),
    choose: async (fig) => {
      await change(fig, async () => {
        await fig.getByLabel("Session", { exact: true }).selectOption("replay");
      });
    },
  },
  {
    path: P4,
    id: "durable-widget",
    name: "crash in charge, no key",
    captions: caps(CH.durable.runs["crash_in_charge|nokey|marker"].frames),
  },
  {
    path: P4,
    id: "durable-widget",
    name: "crash in shipping, clock",
    captions: caps(CH.durable.runs["crash_in_ship|nokey|clock"].frames),
    choose: radio("crash in shipping", "reads the clock"),
  },
  {
    path: P5,
    id: "patterns-widget",
    name: "supervisor",
    captions: timed(CH.patterns.frames.supervisor),
  },
  {
    path: P5,
    id: "patterns-widget",
    name: "map-reduce",
    captions: timed(CH.patterns.frames.map_reduce),
    choose: async (fig) => {
      await change(fig, async () => {
        await fig
          .getByLabel("Pattern", { exact: true })
          .selectOption("map_reduce");
      });
    },
  },
];

for (const c of CASES) {
  test(`${c.id}: ${c.name} shows the reference's captions at key frames`, async ({
    page,
  }) => {
    await page.goto(c.path);
    const fig = page.getByTestId(c.id);
    await expect(fig).toBeVisible({ timeout: ENGINE_TIMEOUT });
    await fig.scrollIntoViewIfNeeded();
    if (c.choose) await c.choose(fig);
    await expect(fig.getByTestId("scrub")).toHaveAttribute(
      "max",
      String(c.captions.length - 1),
    );
    for (const i of keySteps(c.captions.length))
      await frame(fig, i, c.captions[i]!);
  });
}

// Chapters 6–9 compose their captions from the engine's numbers: at the last frame each quotes them.
const ENDS: { path: string; id: string; want: () => string[] }[] = [
  {
    path: "/learn/06-fan-out-and-map-reduce",
    id: "fanout-widget",
    want: () => {
      const f = (CH.fanout.fans as Obj[])[0]!;
      const r = (f.rows as Obj[]).find((x) => x.width === 8)!;
      return [
        `finished in ${fmtMs(r.ms)}, ${(r.speedup as number).toFixed(2)}×`,
      ];
    },
  },
  {
    path: "/learn/07-reliability",
    id: "reliability-widget",
    want: () => {
      const st = (CH.reliability.studies as Obj[]).find(
        (x) => x.name === "retry",
      )!;
      const ok = (st.grid.kept as Obj[]).filter(
        (x) => x.status === "ok",
      ).length;
      return [
        `${ok} of ${(st.grid.kept as Obj[]).length} runs are correct`,
        pct(st.grid.closed.success, 1),
      ];
    },
  },
  {
    path: "/learn/08-running-at-scale",
    id: "scale-widget",
    want: () => {
      const d = CH.scale.details.supervisor as Obj;
      return [`p95 ${fmtMs(d.p95)}, ${fmtUsd(d.cost_per_success)} per success`];
    },
  },
  {
    path: "/learn/09-choosing-a-pattern",
    id: "chooser-widget",
    want: () => {
      const r = (CH.choose.tables["16"] as Obj[]).find(
        (x) => x.pattern === "map_reduce",
      )!;
      return [
        `Pick: Map-reduce`,
        pct(r.success, 1),
        fmtUsd(r.cost_per_success),
      ];
    },
  },
];

for (const c of ENDS) {
  test(`${c.id}: the last frame's caption quotes the reference's numbers`, async ({
    page,
  }) => {
    await page.goto(c.path);
    const fig = page.getByTestId(c.id);
    await expect(fig).toBeVisible({ timeout: ENGINE_TIMEOUT });
    await fig.scrollIntoViewIfNeeded();
    const max = await fig.getByTestId("scrub").getAttribute("max");
    await fig.getByTestId("scrub").fill(max!);
    await expect(fig).toHaveAttribute("data-step", max!);
    for (const w of c.want())
      await expect(fig.getByTestId("caption")).toContainText(w);
  });
}
