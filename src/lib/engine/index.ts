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

/** Chapters too heavy to compute in the page: the widget loads them from src/data/precomputed.json
 * (scripts/precompute.ts writes it with this same function; tests/unit/precomputed.test.ts checks it). */
export const PRECOMPUTED: Chapter[] = ["scale", "choose"];

/** Chapter 5: the patterns over the task grid, and the default task's plans and frames. */
function patternsChapter(cfg: Obj): Obj {
  const S = O.study;
  const d = cfg.default as Obj;
  const task = S.taskOf(d.k, d.result_tokens);
  const model = S.modelOf(d.slope);
  const plans: Obj = {};
  const frames: Obj = {};
  for (const n of O.patterns.PATTERNS) {
    plans[n] = O.patterns.plan(n, task, model);
    frames[n] = O.patterns.patternFrames(plans[n]);
  }
  return {
    grid: S.patternsGrid(cfg.ks, cfg.results, cfg.slopes),
    plans,
    frames,
    task: O.patterns.TASK,
    model: O.patterns.MODEL,
  };
}

/** Everything one chapter animates (and quotes). */
export function runChapter(chapter: Chapter): Obj {
  const cfg = CHAPTER_CONFIGS[chapter];
  if (chapter === "patterns") return patternsChapter(cfg);
  if (chapter === "fanout") {
    const fans = (cfg.itpm as number[]).map((it) => {
      const f = O.study.fanStudy(
        cfg.chunks,
        cfg.chunk_tokens,
        cfg.widths,
        cfg.rpm,
        it,
        cfg.otpm,
      );
      delete f.plan;
      return f;
    });
    return {
      fans,
      plan: O.patterns.planMap(cfg.chunks, cfg.chunk_tokens),
      session: graphSession("map_reduce"),
    };
  }
  if (chapter === "reliability") {
    const S = O.study;
    return {
      studies: (S.REL_CONFIGS as Obj[]).map((c) => S.relStudy(cfg.e, cfg.w, c)),
      rel: S.REL,
      configs: S.REL_CONFIGS,
    };
  }
  if (chapter === "scale") {
    const S = O.study;
    const details: Obj = {};
    for (const n of cfg.patterns as string[])
      details[n] = S.scaleDetail(n, cfg.detail_rate);
    return {
      sweep: S.scaleSweep(cfg.patterns, cfg.rates),
      details,
      defaults: O.des.DEFAULTS,
      rates: cfg.rates,
      detail_rate: cfg.detail_rate,
      workflows: S.SCALE.workflows,
      seed: S.SCALE.seed,
    };
  }
  if (chapter === "choose") {
    const tables: Obj = {};
    (cfg.k as number[]).forEach((k, i) => {
      tables[String(k)] = O.study.chooseTable(k, cfg.rates[i]);
    });
    return { tables, rates: cfg.rates, workflows: O.study.CHOOSE.workflows };
  }
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
