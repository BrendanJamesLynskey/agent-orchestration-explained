/**
 * scripts/smoke-check.ts
 *
 * Post-deploy smoke check, adapted from the companion sites'. Fetches every page and exits
 * non-zero if any fails:
 *
 *     pnpm smoke https://agent-orchestration-explained.vercel.app
 *
 * With no argument it checks http://localhost:3000. For a protected preview deployment, pass
 * the bypass token as VERCEL_BYPASS (sent as the `x-vercel-protection-bypass` header; never
 * printed).
 *
 * Fails when a page is not a 200 (redirects count as failures) or lacks the content that
 * proves it rendered from the engine: the landing page must print the engine's own numbers
 * (computed here with the same code), the data page every conformance session and the
 * LangGraph version, every chapter its MDX (a layer, server-rendered KaTeX, the animation's
 * placeholder), and the header the four-track site switch. (This site ships no data files: the
 * engine computes everything in the page.)
 */
import RECORDING from "@/data/langgraph_recordings.json";
import { formatValue, lookup } from "@/lib/orch/values";
import VENDORED from "@/lib/engine/vendor/VENDORED.json";
import { SECTIONS } from "@/lib/mdx/sections";

/** The author credit: the last line of the About page (brief 35). */
const CREDIT = [
  'data-author-credit="true"',
  "Written and built by",
  'href="https://github.com/BrendanJamesLynskey">Brendan Lynskey</a>',
];

type Result = { path: string; ok: boolean; detail: string };

const headers: Record<string, string> = process.env.VERCEL_BYPASS
  ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS }
  : {};

const SWITCH = [
  'data-site-switch="menu"',
  'href="https://transformer-training-explained.vercel.app"',
  'href="https://agent-harnesses-explained.vercel.app"',
  'href="https://agent-protocols-explained.vercel.app"',
  'href="https://agent-context-explained.vercel.app"',
  'href="https://agent-orchestration-explained.vercel.app"',
  'href="https://agent-evals-explained.vercel.app"',
  'href="https://agent-security-explained.vercel.app"',
  'data-site-group="foundations"',
  'data-site-group="hardware"',
  'href="https://ai-racks-explained.vercel.app"',
  'data-site-place="orchestration"',
  'data-site-brand="true" class="focus-ring whitespace-nowrap rounded text-sm font-medium tracking-tight" href="/">Agent Orchestration Explained</a>',
  'data-site-key="inference"',
  'href="https://gpu-kernels-explained.vercel.app"',
];

async function checkPage(
  base: string,
  path: string,
  mustContain: string[],
): Promise<Result> {
  try {
    const res = await fetch(base + path, { redirect: "manual", headers });
    if (res.status !== 200)
      return { path, ok: false, detail: String(res.status) };
    const html = await res.text();
    const missing = mustContain.filter((s) => !html.includes(s));
    if (missing.length)
      return {
        path,
        ok: false,
        detail: `200 but missing ${missing.join(", ")}`,
      };
    return { path, ok: true, detail: "200" };
  } catch (err) {
    return { path, ok: false, detail: (err as Error).message };
  }
}

async function main(): Promise<void> {
  const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
  const checks: Promise<Result>[] = [
    checkPage(base, "/", [
      "Agent Orchestration Explained",
      formatValue(lookup("conformance.checkpoints"), "int"),
      formatValue(lookup("conformance.ops"), "int"),
      ...SWITCH,
    ]),
    checkPage(base, "/data", [
      `langgraph ${formatValue(lookup("conformance.langgraph"), "raw")}`,
      ...(RECORDING.sessions as { name: string }[]).map((x) => `>${x.name}<`),
    ]),
    checkPage(base, "/about", [
      ...CREDIT,
      "The engine",
      VENDORED.commit.slice(0, 7),
    ]),
    checkPage(
      base,
      "/learn",
      SECTIONS.map((x) => x.slug),
    ),
    ...SECTIONS.map((x) =>
      checkPage(base, `/learn/${x.slug}`, [
        'data-layer="concept"',
        "data-pending-widget",
        'class="katex"',
        ...SWITCH,
      ]),
    ),
  ];
  const results = await Promise.all(checks);
  let failed = 0;
  for (const r of results) {
    if (!r.ok) failed++;
    console.log(`${r.ok ? "ok  " : "FAIL"} ${r.path} ${r.detail}`);
  }
  console.log(
    `${results.length - failed}/${results.length} checks passed against ${base}`,
  );
  if (failed) process.exit(1);
}

void main();
