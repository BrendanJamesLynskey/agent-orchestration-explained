/**
 * Captures the README screenshots. Manual run, output committed.
 *
 *   pnpm build && pnpm start   # in another shell
 *   pnpm screenshots           # headless Chromium writes docs/screenshots/*.png
 *
 * Light theme, fixed viewport, reduced motion (nothing plays by itself), and
 * each animation set to a chosen mid-animation frame by its scrub bar, so
 * the pictures are reproducible.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium } from "@playwright/test";

const OUT = path.join(process.cwd(), "docs", "screenshots");
const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";

type Shot = { name: string; path: string; widget?: string; step?: number };

const SHOTS: Shot[] = [
  { name: "01-landing", path: "/" },
  {
    name: "02-supersteps",
    path: "/learn/01-from-a-chain-to-a-graph",
    widget: "graph-widget",
    step: 7,
  },
  {
    name: "03-reducers",
    path: "/learn/02-state-channels-and-reducers",
    widget: "reducer-widget",
    step: 8,
  },
  {
    name: "04-checkpoints",
    path: "/learn/03-checkpoints-and-interrupts",
    widget: "checkpoint-widget",
    step: 5,
  },
  {
    name: "05-durable",
    path: "/learn/04-durable-execution",
    widget: "durable-widget",
    step: 12,
  },
  { name: "06-data", path: "/data" },
];

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  for (const s of SHOTS) {
    await page.goto(BASE + s.path, { waitUntil: "networkidle" });
    const file = path.join(OUT, `${s.name}.png`);
    if (s.widget) {
      const fig = page.getByTestId(s.widget);
      await fig.waitFor({ timeout: 30_000 });
      if (s.step !== undefined)
        await fig.getByTestId("scrub").fill(String(s.step));
      await fig.screenshot({ path: file });
    } else {
      await page.screenshot({ path: file });
    }
    console.log(`wrote ${path.relative(process.cwd(), file)}`);
  }
  await browser.close();
}

void main();
