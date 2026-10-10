/**
 * Node states for a frame, derived from the engine's frames (nothing is invented here: which
 * node runs, waits, fails or pauses comes from the runtime's results).
 */
import type { Obj } from "@/lib/engine";
import type { NodeState } from "@/components/viz/GraphView";

const START = "__start__";

/** States after super-step frame `i` of `frames` (orchestration `superstepFrames`). */
export function superstepStates(
  frames: Obj[],
  i: number,
): Record<string, NodeState> {
  const st: Record<string, NodeState> = {};
  for (let j = 0; j < i; j++) {
    const f = frames[j]!;
    if (f.phase === "apply")
      for (const n of f.active as string[]) if (n !== START) st[n] = "done";
  }
  const f = frames[i]!;
  if (f.phase === "run" || f.phase === "barrier") {
    for (const n of f.active as string[]) if (n !== START) st[n] = "active";
  } else if (f.phase === "apply") {
    for (const n of f.active as string[]) if (n !== START) st[n] = "done";
    const waiting = new Set<string>();
    for (const e of f.fired as Obj[])
      if (e.kind === "join" && (e.waiting as string[]).length)
        waiting.add(e.to);
    const went = new Set<string>(
      (f.fired as Obj[])
        .filter((e) => e.kind !== "join")
        .map((e) => e.to as string),
    );
    for (const n of f.next as string[])
      st[n] = waiting.has(n) && !went.has(n) ? "waiting" : "next";
  } else {
    const wrote = new Set((f.writes as [string, Obj][]).map((w) => w[0]));
    for (const n of f.active as string[]) {
      if (f.status === "error" && !wrote.has(n)) st[n] = "failed";
      else if (f.status === "interrupted" && !wrote.has(n)) st[n] = "paused";
      else if (
        f.status === "error" &&
        f.phase === "halt" &&
        Object.keys(f.folds ?? {}).length
      )
        st[n] = "failed";
      else st[n] = "done";
    }
  }
  return st;
}

/** Edges that fired in an apply frame, as "from>to" (START's edges included). */
export function firedEdges(f: Obj): string[] {
  if (f.phase !== "apply") return [];
  return (f.fired as Obj[]).map((e) => `${e.from}>${e.to}`);
}

/**
 * Node states at a checkpoint of a timeline (chapter 3): ran from it, waiting in next, failed,
 * paused. `fresh`: the checkpoint has just been written, so its tasks are all still to run.
 */
export function checkpointStates(
  history: Obj[],
  focus: number | null,
  fresh = false,
): Record<string, NodeState> {
  const st: Record<string, NodeState> = {};
  if (focus === null || focus === undefined) return st;
  // every node that ran on the path from the root to this checkpoint is done
  const byId = new Map<number, Obj>(history.map((c) => [c.id as number, c]));
  let c = byId.get(focus);
  const path: Obj[] = [];
  while (c) {
    path.unshift(c);
    c = c.parent === null ? undefined : byId.get(c.parent);
  }
  for (const p of path.slice(0, -1))
    for (const t of p.tasks as Obj[])
      if (t.result !== null && t.name !== START) st[t.name] = "done";
  const here = byId.get(focus)!;
  for (const t of here.tasks as Obj[]) {
    if (t.name === START) continue;
    if (fresh) st[t.name] = "next";
    else if (t.result !== null) st[t.name] = "done";
    else if (t.error) st[t.name] = "failed";
    else if ((t.interrupts as unknown[]).length) st[t.name] = "paused";
    else st[t.name] = "next";
  }
  return st;
}

/** Lanes: a checkpoint stays on its parent's lane if it is the parent's first child. */
export function lanes(history: Obj[]): Record<number, number> {
  const lane: Record<number, number> = {};
  const firstChild: Record<number, number> = {};
  let next = 0;
  for (const c of history) {
    if (c.parent === null) lane[c.id] = next++;
    else if (firstChild[c.parent] === undefined) {
      firstChild[c.parent] = c.id;
      lane[c.id] = lane[c.parent]!;
    } else lane[c.id] = next++;
  }
  return lane;
}

/** A history event as one short line. */
export function eventLabel(ev: Obj, history: Obj[]): string {
  const act = (seq: number) =>
    history.find((e) => e.type === "activity_scheduled" && e.seq === seq)
      ?.activity ?? "?";
  switch (ev.type) {
    case "workflow_started":
      return "workflow started";
    case "activity_scheduled":
      return `scheduled ${ev.activity}`;
    case "activity_completed":
      return `completed ${act(ev.seq)} (${ev.result})`;
    case "activity_timed_out":
      return `timed out ${act(ev.seq)} (attempt ${ev.attempt})`;
    case "activity_failed":
      return `failed ${act(ev.seq)}`;
    case "marker":
      return `marker ${ev.name} = ${ev.value}`;
    default:
      return "workflow completed";
  }
}
