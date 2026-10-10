/**
 * The chapters' MDX: each opens with its animation; every ```ts block is cut from the vendored
 * engine (whitespace-collapsed, because Prettier reformats MDX code blocks); every equation
 * compiles in KaTeX; internal links point at real pages; deck links point at the owner's decks.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import katex from "katex";
import { describe, expect, it } from "vitest";

import { SECTIONS } from "@/lib/mdx/sections";

const ROOT = path.join(__dirname, "../..");
const DIR = path.join(ROOT, "content/chapters");
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".mdx"));
const squash = (s: string) => s.replace(/\s+/g, " ").trim();
const VENDOR = path.join(ROOT, "src/lib/engine/vendor");
const tsFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory()
      ? tsFiles(p)
      : f.endsWith(".ts")
        ? [p]
        : [];
  });
const ENGINE = tsFiles(VENDOR)
  .map((f) => squash(readFileSync(f, "utf8")))
  .join("\n");
const PAGES = ["/data", "/about", "/learn"];
const BUILDER = squash(
  readFileSync(path.join(ROOT, "src/data/langgraph_graphs.py.txt"), "utf8"),
);

describe("chapter files", () => {
  it("there is one per section, in order", () => {
    expect(FILES.sort()).toEqual(SECTIONS.map((s) => `${s.slug}.mdx`));
  });
});

for (const f of FILES) {
  const src = readFileSync(path.join(DIR, f), "utf8");
  describe(f, () => {
    it("opens with its animation (the hero comes before any prose)", () => {
      expect(src.trimStart()).toMatch(/^<[A-Z][a-zA-Z0-9]+Widget[ >]/);
    });

    it("cuts every Python block from the LangGraph builder the conformance check uses", () => {
      for (const m of src.matchAll(/```python\n([\s\S]*?)```/g))
        expect(BUILDER, m[1]).toContain(squash(m[1]!));
    });

    it("cuts every TypeScript block from the vendored engine", () => {
      const blocks = [...src.matchAll(/```ts\n([\s\S]*?)```/g)].map(
        (m) => m[1]!,
      );
      expect(blocks.length).toBeGreaterThan(0);
      for (const b of blocks) expect(ENGINE, b).toContain(squash(b));
    });

    it("compiles every animation equation", () => {
      for (const m of src.matchAll(/tex="([^"]+)"/g)) {
        expect(() =>
          katex.renderToString(m[1]!, {
            displayMode: true,
            throwOnError: true,
            strict: "ignore",
            trust: (ctx) => ctx.command === "\\htmlClass",
          }),
        ).not.toThrow();
      }
    });

    it("links only to real pages and to the owner's decks", () => {
      const slugs = new Set<string>(SECTIONS.map((s) => s.slug));
      for (const m of src.matchAll(/\]\((\/[^)]*)\)/g)) {
        const href = m[1]!;
        if (href.startsWith("/learn/"))
          expect(slugs.has(href.slice(7)), href).toBe(true);
        else expect(PAGES).toContain(href);
      }
      for (const m of src.matchAll(
        /https:\/\/brendanjameslynskey\.github\.io\/([A-Za-z0-9_]+)\/([^)\s]*)/g,
      )) {
        const [all, repo, anchor] = m;
        if (/^LLM_Hub_/.test(repo!)) expect(anchor, all).toBe("");
        // Introduction_to_LangGraph is a Reveal deck of 19 top-level sections, #/0 … #/18
        // (no vertical stacks; slide titles checked 2026-10-10)
        else if (repo === "Introduction_to_LangGraph")
          expect(anchor, all).toMatch(/^(#\/(\d|1[0-8]))?$/);
        else expect(anchor, all).toMatch(/^(#slide-(0\d|1[01]))?$/);
      }
    });

    it("has a 'Go deeper' callout and an illustrative callout", () => {
      expect(src).toContain('<Callout kind="deeper">');
      expect(src).toContain('<Callout kind="illustrative">');
    });
  });
}
