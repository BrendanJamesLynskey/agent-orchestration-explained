/**
 * Frame tests on the page (visual standard §4): set key frames of every animation and require
 * the caption on screen to be the caption of the Python reference's frame
 * (tests/fixtures/site_fixtures.json): the engine writes the captions, in both languages.
 */
import { expect, test, type Locator } from "@playwright/test";

import fx from "../fixtures/site_fixtures.json";

import type { Obj } from "@/lib/engine";

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
