/**
 * src/data/precomputed.json (what the heavy chapters load in the page) is exactly what the
 * vendored engine computes now (scripts/precompute.ts writes it).
 */
import { describe, expect, it } from "vitest";

import PRE from "@/data/precomputed.json";
import { PRECOMPUTED, runChapter, type Obj } from "@/lib/engine";

describe("precomputed chapters equal the engine", () => {
  it("lists scale and choose", () =>
    expect([...PRECOMPUTED].sort()).toEqual(Object.keys(PRE).sort()));
  for (const ch of PRECOMPUTED)
    it(ch, () =>
      expect(JSON.parse(JSON.stringify(runChapter(ch)))).toEqual(
        (PRE as Obj)[ch],
      ),
    );
});
