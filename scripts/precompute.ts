/**
 * scripts/precompute.ts
 *
 * Writes src/data/precomputed.json: the data of the chapters too heavy to compute in the page
 * (src/lib/engine's PRECOMPUTED: the load sweep of chapter 8 and the chooser's tables of
 * chapter 9, a few thousand simulated workflows each), computed by the same vendored engine
 * function the other chapters run in the browser (runChapter). tests/unit/precomputed.test.ts
 * fails if the file differs from what runChapter returns now.
 *
 *     pnpm precompute
 */
import { writeFileSync } from "node:fs";

import { PRECOMPUTED, runChapter } from "../src/lib/engine";

const out: Record<string, unknown> = {};
for (const ch of PRECOMPUTED) out[ch] = runChapter(ch);
writeFileSync("src/data/precomputed.json", JSON.stringify(out) + "\n");
console.log(`wrote src/data/precomputed.json (${PRECOMPUTED.join(", ")})`);
