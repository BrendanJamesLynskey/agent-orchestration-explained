/**
 * Pure helpers for chapters 5–9: what the pictures show at a moment, derived from the engine's
 * outputs (plans and their schedules, the discrete-event simulation's traces and series, the
 * reliability runs, the chooser's steps). Nothing here simulates: every state comes from the
 * vendored engine, and tests/unit/des.test.ts checks these functions against it.
 */
import type { Obj } from "@/lib/engine";

const NARROW: Record<string, string> = {
  supervisor: "sup",
  researcher: "res",
  reducer: "reduce",
  planner: "plan",
};

/** A short lane label for an agent: "worker:pricing" → "w·pricing", "worker:topic 12" → "w12". */
export function agentLabel(name: string, narrow = false): string {
  const [kind, rest] = name.includes(":")
    ? [name.slice(0, name.indexOf(":")), name.slice(name.indexOf(":") + 1)]
    : [name, ""];
  if (!rest) return narrow ? (NARROW[name] ?? name) : name;
  const short: Record<string, string> = {
    worker: "w",
    specialist: "s",
    debater: "d",
    lead: "lead",
    map: "map",
  };
  const k = short[kind] ?? kind;
  const topic = rest.startsWith("topic ") ? rest.slice(6) : rest;
  if (/^\d+$/.test(topic)) return `${k}${topic}`;
  if (k === "lead") return `lead ${topic}`;
  return narrow ? `${k}·${topic.slice(0, 4)}` : `${k}·${topic}`;
}

/** Tick spacing for an axis of length `max`: 1, 2 or 5 times a power of ten, about `n` ticks. */
export function tickStep(max: number, n = 5): number {
  if (!(max > 0)) return 1;
  const raw = max / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5]) if (m * p >= raw) return m * p;
  return 10 * p;
}

/** The ticks 0, step, 2·step … up to max. */
export function ticks(max: number, n = 5): number[] {
  const st = tickStep(max, n);
  const out: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += st) out.push(v);
  return out;
}

/** Evenly spaced moments for a time animation: n + 1 times from 0 to the horizon. */
export function moments(horizon: number, n: number): number[] {
  return Array.from({ length: n + 1 }, (_, i) => (horizon * i) / n);
}

export type AttemptState = "future" | "queued" | "running" | "done" | "failed";

/** One attempt of a DES trace at time t. */
export function attemptState(a: Obj, t: number): AttemptState {
  if (t < a.queued) return "future";
  if (a.start === null || t < a.start) return "queued";
  if (t < a.end) return "running";
  return a.outcome === "ok" || a.outcome === "tool" ? "done" : "failed";
}

/** Counts of a trace's model-call attempts by state at time t (tool calls excluded). */
export function traceCounts(
  trace: Obj[],
  t: number,
): Record<AttemptState, number> {
  const c: Record<AttemptState, number> = {
    future: 0,
    queued: 0,
    running: 0,
    done: 0,
    failed: 0,
  };
  for (const a of trace) if (a.outcome !== "tool") c[attemptState(a, t)] += 1;
  return c;
}

/** The value of the DES's step-function `changes` ([t, queue, inflight, insys, ok, bad]) at t. */
export function changeAt(changes: number[][], t: number): number[] {
  let r: number[] = [t, 0, 0, 0, 0, 0];
  for (const c of changes) {
    if (c[0]! > t) break;
    r = c;
  }
  return r;
}

/** A histogram of latencies (ms) into `bins` equal bins over [0, max]; values above max go in the last bin. */
export function histogram(xs: number[], max: number, bins: number): number[] {
  const out = new Array<number>(bins).fill(0);
  for (const x of xs) {
    let i = Math.floor((x / max) * bins);
    if (i >= bins) i = bins - 1;
    if (i < 0) i = 0;
    out[i]! += 1;
  }
  return out;
}

/** Nearest-rank percentile, as the engine computes it (des.pct). */
export function nearestRank(xs: number[], q: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.max(0, Math.floor((q * s.length + 99) / 100) - 1);
  return s[i]!;
}

/** The workflows of a DES run that have finished by time t, with their latencies. */
export function finishedBy(runs: Obj[], t: number): Obj[] {
  return runs.filter((r) => r.end !== null && r.end <= t);
}

/**
 * The reliability grid at step k (0 = nothing run yet): for each kept run, the outcome of each of
 * its first k steps ("ok", "wrong", "gave_up" or "" for not reached) and how many attempts each took.
 */
export function gridAt(
  kept: Obj[],
  k: number,
): { cells: string[][]; tries: number[][]; alive: number } {
  const cells: string[][] = [];
  const tries: number[][] = [];
  let alive = 0;
  for (const run of kept) {
    const steps = run.steps as string[][];
    const row: string[] = [];
    const tr: number[] = [];
    let dead = false;
    for (let i = 0; i < k; i++) {
      const log = steps[i];
      if (!log || dead) {
        row.push("");
        tr.push(0);
        continue;
      }
      const last = log[log.length - 1]!;
      const ended = last === "ok" || last === "wrong";
      row.push(ended ? last : "gave_up");
      tr.push(log.length);
      if (!ended) dead = true;
    }
    if (!dead && !row.includes("wrong")) alive += 1;
    cells.push(row);
    tries.push(tr);
  }
  return { cells, tries, alive };
}

/** The chooser's frames: the full table, then one frame per constraint applied, then the pick. */
export function chooseFrames(result: Obj, all: string[]): Obj[] {
  const frames: Obj[] = [
    { kind: "start", alive: [...all], struck: [], pick: null },
  ];
  let struck: string[] = [];
  for (const st of result.steps as Obj[]) {
    struck = [...struck, ...(st.struck as string[])];
    frames.push({
      kind: "constraint",
      step: st,
      alive: [...(st.kept as string[])],
      struck: [...struck],
      pick: null,
    });
  }
  frames.push({
    kind: "pick",
    alive: [...(result.alive as string[])],
    struck: [...struck],
    pick: result.pick,
  });
  return frames;
}

/** What happened at step k (1-based) across the kept runs: attempts by outcome, and runs reaching it. */
export function stepSummary(kept: Obj[], k: number): Record<string, number> {
  const out: Record<string, number> = {
    reached: 0,
    error: 0,
    caught: 0,
    rejected_ok: 0,
    wrong: 0,
    ok: 0,
    gave_up: 0,
  };
  for (const run of kept) {
    const log = (run.steps as string[][])[k - 1];
    if (!log) continue;
    out.reached! += 1;
    for (const o of log) out[o] = (out[o] ?? 0) + 1;
    const last = log[log.length - 1]!;
    if (last !== "ok" && last !== "wrong") out.gave_up! += 1;
  }
  return out;
}

/** Short pattern names for narrow tables and chart labels. */
export const SHORT: Record<string, string> = {
  single: "single",
  supervisor: "supervisor",
  hierarchical: "hierarch.",
  swarm: "swarm",
  debate: "debate",
  map_reduce: "map-reduce",
};

/** A compact duration: "51.7 s", "3.2 min", "60.8 h". */
export function durShort(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  if (s < 3600) return `${(s / 60).toFixed(1)} min`;
  return `${(s / 3600).toFixed(1)} h`;
}
