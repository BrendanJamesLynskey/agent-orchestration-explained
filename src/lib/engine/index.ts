/**
 * The vendored Agent_Loop_Sim engine (src/lib/engine/vendor, pinned in VENDORED.json) and what
 * each chapter animates (src/data/chapter_configs.json). Every frame is computed by the engine's
 * orchestration module, whose graph runtime is checked checkpoint for checkpoint against real
 * LangGraph in the engine's CI. Nothing here runs a language model.
 */
import CONFIGS from "@/data/chapter_configs.json";

import * as O from "./vendor/orchestration/index";

export { O };
export type Obj = { [k: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export type Chapter = keyof typeof CONFIGS;
export const CHAPTER_CONFIGS = CONFIGS as unknown as Record<Chapter, Obj>;

/** The fault the durable-execution widget injects, as engine parameters. */
export function faultParams(fault: string, key: boolean, choose: string): Obj {
  const p: Obj = { idempotency: key, choose };
  if (fault === "crash_after_charge") p.crash = { after_event: 4 };
  else if (fault === "crash_in_charge")
    p.crash = { in_activity: "charge_card" };
  else if (fault === "crash_in_ship") p.crash = { in_activity: "ship_express" };
  else if (fault === "lost_reply") p.lost = { charge_card: [1] };
  return p;
}

/** One session as the graph widgets draw it: the spec, its layout and the first op's super-steps. */
function graphSession(name: string): Obj {
  const s = O.session(name);
  const g = O.graph(s.graph);
  return {
    name,
    title: g.title,
    graph: g,
    layout: O.layout(g),
    supersteps: O.sessionSupersteps(g, s)[0],
  };
}

/** Everything one chapter animates (and quotes). */
export function runChapter(chapter: Chapter): Obj {
  const cfg = CHAPTER_CONFIGS[chapter];
  if (chapter === "graph" || chapter === "reducers") {
    const out: Obj = {};
    for (const n of cfg.sessions as string[]) out[n] = graphSession(n);
    return { sessions: out };
  }
  if (chapter === "checkpoints") {
    const out: Obj = {};
    for (const n of cfg.sessions as string[]) {
      const s = O.session(n);
      const g = O.graph(s.graph);
      out[n] = {
        name: n,
        title: g.title,
        graph: g,
        layout: O.layout(g),
        timeline: O.timelineFrames(g, s),
      };
    }
    return { sessions: out };
  }
  const runs: Obj = {};
  for (const f of cfg.faults as string[])
    for (const key of [false, true])
      for (const choose of O.CHOOSE_MODES)
        runs[`${f}|${key ? "key" : "nokey"}|${choose}`] = O.runDurable(
          faultParams(f, key, choose),
        );
  const sweeps: Obj[] = [];
  for (const q of cfg.sweep_q as number[])
    for (const a of cfg.sweep_a as number[])
      sweeps.push(O.chargeSweep(q, a, cfg.sweep_runs, cfg.sweep_seed));
  return {
    workflow: O.WORKFLOW,
    runs,
    sweeps,
    consts: { timeout_ms: O.TIMEOUT_MS, restart_ms: O.RESTART_MS },
  };
}
