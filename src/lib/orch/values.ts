/**
 * Every number the chapters quote comes from here: a path into what the engine computes for each
 * chapter (the same data the animations draw, src/lib/engine's runChapter), e.g.
 * "graph.sessions.fanout.supersteps.graph_ms", or into the LangGraph conformance recording
 * ("conformance.sessions"). The MDX writes <V of="…" fmt="…" />, so prose cannot drift from the
 * tested engine (tests/unit/values.test.ts checks every path the chapters use resolves).
 */
import RECORDING from "@/data/langgraph_recordings.json";
import {
  CHAPTER_CONFIGS,
  O,
  runChapter,
  type Chapter,
  type Obj,
} from "@/lib/engine";
import { fmtInt, fmtMs, fmtUsd, pct, trim } from "@/lib/format";

export type Fmt =
  | "int"
  | "pct"
  | "num"
  | "f2"
  | "f3"
  | "f4"
  | "raw"
  | "ms"
  | "dur"
  | "usd"
  | "pct1"
  | "val";

let TREE: Obj | null = null;

export function tree(): Obj {
  if (TREE) return TREE;
  const t: Obj = {};
  for (const ch of Object.keys(CHAPTER_CONFIGS) as Chapter[])
    t[ch] = runChapter(ch);
  const rec = RECORDING as Obj;
  let ops = 0;
  let cps = 0;
  for (const s of rec.sessions as Obj[]) {
    ops += (s.ops as Obj[]).length;
    cps += ((s.ops as Obj[])[(s.ops as Obj[]).length - 1]!.history as Obj[])
      .length;
  }
  t.conformance = {
    langgraph: rec.langgraph,
    checkpoint: rec.langgraph_checkpoint,
    sessions: (rec.sessions as Obj[]).length,
    ops,
    checkpoints: cps,
  };
  t.consts = {
    ckpt_ms: O.CKPT_MS,
    timeout_ms: O.TIMEOUT_MS,
    restart_ms: O.RESTART_MS,
    max_attempts: O.MAX_ATTEMPTS,
  };
  // derived: each teaching graph's speed-up over one node at a time
  t.derived = {};
  for (const [n, s] of Object.entries(t.graph.sessions as Obj)) {
    const ss = (s as Obj).supersteps as Obj;
    t.derived[n] = {
      speedup: (ss.sequential_ms as number) / (ss.graph_ms as number),
    };
  }
  // derived: per durable run, its outcome (for prose)
  t.durable_summary = {};
  for (const [k, r] of Object.entries(t.durable.runs as Obj)) {
    const run = r as Obj;
    t.durable_summary[k] = {
      status: run.status,
      charges: run.charges,
      charged: run.charged,
      events: (run.history as Obj[]).length,
      t_end: run.t_end,
    };
  }
  // the session timelines' totals
  t.timeline_summary = {};
  for (const [k, s] of Object.entries(t.checkpoints.sessions as Obj)) {
    const tl = (s as Obj).timeline as Obj;
    const ops2 = tl.ops as Obj[];
    let runs = 0;
    let eff = 0;
    for (const o of ops2) {
      runs += (o.calls as string[]).length;
      eff += (o.effects as string[]).length;
    }
    t.timeline_summary[k] = {
      ops: ops2.length,
      checkpoints: (ops2[ops2.length - 1]!.history as Obj[]).length,
      runs,
      effects: eff,
    };
  }
  // chapters 5–9: the studies keyed for prose
  t.pat = {};
  for (const g of t.patterns.grid as Obj[]) {
    const row: Obj = {};
    for (const r of g.rows as Obj[]) row[r.pattern] = r;
    t.pat[`${g.k}|${g.result_tokens}|${Math.round(g.slope * 1000)}`] = row;
  }
  t.fan = {};
  for (const f of t.fanout.fans as Obj[]) {
    const w: Obj = {};
    for (const r of f.rows as Obj[]) w[String(r.width)] = r;
    t.fan[String(f.itpm)] = {
      t1: f.t1,
      bound_ms: f.bound_ms,
      parallel_fraction: f.parallel_fraction,
      tin: f.ceiling.tin,
      req: f.ceiling.req,
      tout: f.ceiling.tout,
      w,
    };
  }
  t.rel = {};
  for (const st of t.reliability.studies as Obj[]) {
    const byN: Obj = {};
    for (const c of st.curve as Obj[]) byN[String(c.n)] = c;
    t.rel[st.name] = byN;
  }
  t.load = {};
  for (const x of t.scale.sweep as Obj[]) {
    const cap = x.capacity as Obj;
    const byRate: Obj = {
      capacity: cap,
      calls: (t.scale.defaults.rpm as number) / cap.requests,
      uncached_in: (t.scale.defaults.itpm as number) / cap.input,
    };
    (x.rows as Obj[]).forEach((r, i) => {
      const rate = (t.scale.rates as number[])[i]!;
      byRate[String(rate)] = { ...r, rho: rate / cap.min };
    });
    t.load[x.pattern] = byRate;
  }
  t.pick = {};
  for (const [k, rows] of Object.entries(t.choose.tables as Obj)) {
    const byP: Obj = {};
    for (const r of rows as Obj[]) byP[r.pattern] = r;
    t.pick[k] = byP;
  }
  TREE = t;
  return t;
}

export function lookup(path: string): unknown {
  // keys may contain dots or bars: at each level take the shortest run of segments that names a key
  const parts = path.split(".");
  let v: unknown = tree();
  let i = 0;
  while (i < parts.length) {
    if (v === null || typeof v !== "object")
      throw new Error(`no value at "${path}"`);
    let j = i + 1;
    while (j <= parts.length && !(parts.slice(i, j).join(".") in (v as Obj)))
      j++;
    if (j > parts.length) throw new Error(`no value at "${path}"`);
    v = (v as Obj)[parts.slice(i, j).join(".")];
    i = j;
  }
  if (v === undefined || v === null) throw new Error(`no value at "${path}"`);
  return v;
}

export function formatValue(v: unknown, fmt: Fmt): string {
  if (fmt === "raw") return String(v);
  if (fmt === "val") return O.fmt(v);
  const n = v as number;
  switch (fmt) {
    case "int":
      return fmtInt(n);
    case "pct":
      return pct(n);
    case "num":
      return trim(n);
    case "f2":
      return n.toFixed(2);
    case "f3":
      return n.toFixed(3);
    case "f4":
      return n.toFixed(4);
    case "ms":
      return `${fmtInt(n)} ms`;
    case "dur":
      return fmtMs(n);
    case "usd":
      return fmtUsd(n);
    case "pct1":
      return pct(n, 1);
  }
}
