/**
 * Every <V of="…" /> in the chapters resolves to an engine value, and the numbers the prose
 * quotes are the ones the engine's recorded run (orchestration_results.md) has.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { formatValue, lookup, tree, type Fmt } from "@/lib/orch/values";

const DIR = join(__dirname, "../../content/chapters");
const RESULTS = readFileSync(
  join(__dirname, "../../src/data/orchestration_results.md"),
  "utf8",
);

describe("every quoted value resolves", () => {
  for (const f of readdirSync(DIR).filter((x) => x.endsWith(".mdx"))) {
    const src = readFileSync(join(DIR, f), "utf8");
    it(f, () => {
      const uses = [...src.matchAll(/<V of="([^"]+)"(?: fmt="([^"]+)")? \/>/g)];
      expect(uses.length).toBeGreaterThan(2);
      for (const [, path, fmt] of uses)
        expect(
          () => formatValue(lookup(path!), (fmt ?? "num") as Fmt),
          path,
        ).not.toThrow();
    });
  }
});

describe("formats and lookups", () => {
  it("formats", () => {
    expect(formatValue(1234, "int")).toBe("1,234");
    expect(formatValue(0.5, "pct")).toBe("50%");
    expect(formatValue(1.23456, "num")).toBe("1.23");
    expect(formatValue(1.234, "f2")).toBe("1.23");
    expect(formatValue(1.2345, "f3")).toBe("1.234");
    expect(formatValue(1.23456, "f4")).toBe("1.2346");
    expect(formatValue("x", "raw")).toBe("x");
    expect(formatValue(3260, "ms")).toBe("3,260 ms");
    expect(formatValue([42, 41], "val")).toBe("[42, 41]");
  });
  it("lookups fail loudly", () => {
    expect(() => lookup("graph.nope")).toThrow();
    expect(() => lookup("conformance.sessions.x")).toThrow();
    expect(tree()).toBe(tree());
  });
});

describe("the prose agrees with the engine's recorded results", () => {
  it("conformance totals", () => {
    const c = tree().conformance;
    expect(RESULTS).toContain(
      `langgraph ${c.langgraph} (langgraph-checkpoint ${c.checkpoint}), ${c.sessions} sessions, ${c.ops} operations, ${c.checkpoints} checkpoints`,
    );
  });
  it("teaching graph timings", () => {
    for (const [n, s] of Object.entries(
      tree().graph.sessions as Record<
        string,
        {
          supersteps: {
            steps: number;
            graph_ms: number;
            sequential_ms: number;
          };
        }
      >,
    )) {
      const ss = s.supersteps;
      expect(RESULTS).toContain(
        `| ${n} | ${ss.steps} | ${ss.graph_ms} | ${ss.sequential_ms} |`,
      );
    }
  });
});
