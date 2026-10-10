"use client";

/**
 * Chapter 2: two branches write the same key. Beside the graph, the barrier: while the branches
 * run, how long each takes (so which finishes first); at the barrier, their writes queued in the
 * order they will be applied (task order: by node name); then the reducer's fold, write by write
 * (orchestration `folds`). With no reducer the second write is rejected (InvalidUpdateError) and
 * no checkpoint is saved. The fourth graph shows what a conditional edge's router sees.
 */
import { useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { Segmented, Stat } from "@/components/ui/Controls";
import { GraphView } from "@/components/viz/GraphView";
import { StatePanel } from "@/components/viz/StatePanel";
import { useSvgFont } from "@/components/viz/useSvgFont";
import { O, type Obj } from "@/lib/engine";
import { fmtMs } from "@/lib/format";
import { firedEdges, superstepStates } from "@/lib/orch/states";
import { STATE_COLOUR, nodeColour } from "@/lib/viz/palette";

import { EngineStatus } from "../agent/EngineStatus";
import { useEngine } from "./useEngine";

const W = 360;
const H = 140;
const SESSIONS = [
  { value: "merge_overwrite", label: "no reducer" },
  { value: "merge_add", label: "add (list)" },
  { value: "merge_max", label: "max" },
  { value: "router_view", label: "router view" },
] as const;
type Session = (typeof SESSIONS)[number]["value"];

const HATCH =
  "repeating-linear-gradient(45deg, rgb(213 94 0 / 0.18) 0 4px, transparent 4px 8px)";

export default function ReducerWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const st = useEngine("reducers");
  if (st.status !== "ready")
    return (
      <EngineStatus error={st.status === "error" ? st.error : undefined} />
    );
  return <Reducers data={st.data}>{children}</Reducers>;
}

function Barrier({ f, sess }: { f: Obj; sess: Obj }): JSX.Element {
  const order = (sess.graph.nodes as Obj[]).map((n) => n.name as string);
  const ms: Record<string, number> = { __start__: 0 };
  for (const n of sess.graph.nodes as Obj[]) ms[n.name] = n.ms;
  const active = (f.active as string[]).filter((n) => n !== "__start__");
  const maxMs = Math.max(1, ...active.map((n) => ms[n]!));
  if (f.phase === "run")
    return (
      <div data-testid="barrier" data-phase="run">
        <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
          Running on one snapshot
        </p>
        <ul className="mt-1 space-y-1">
          {active.map((n) => (
            <li key={n} className="text-xs">
              <span className="font-mono">{n}</span>
              <span className="ml-1 text-neutral-600 dark:text-neutral-400">
                finishes at {fmtMs(ms[n]!)}
              </span>
              <div
                className="mt-0.5 h-2 rounded"
                style={{
                  width: `${(100 * ms[n]!) / maxMs}%`,
                  background: nodeColour(order, n),
                }}
              />
            </li>
          ))}
          {!active.length && (
            <li className="text-xs text-neutral-600 dark:text-neutral-400">
              __start__ writes the input
            </li>
          )}
        </ul>
      </div>
    );
  if (f.phase === "barrier")
    return (
      <div data-testid="barrier" data-phase="barrier">
        <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
          At the barrier, in the order they will be applied
        </p>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs">
          {(f.writes as [string, Obj][]).map(([n, w]) => (
            <li key={n} data-write={n}>
              <span
                className="font-mono"
                style={{ borderBottom: `3px solid ${nodeColour(order, n)}` }}
              >
                {n}
              </span>{" "}
              <span className="break-words font-mono text-neutral-700 dark:text-neutral-300">
                {O.fmt(w)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    );
  const folds = (f.folds ?? {}) as Obj;
  return (
    <div data-testid="barrier" data-phase={f.phase}>
      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
        The reducers fold the writes in
      </p>
      <div className="mt-1 space-y-2">
        {Object.entries(folds).map(([k, seq]) => {
          const chan = (sess.graph.state as Obj[]).find((c) => c.key === k)!;
          return (
            <div key={k} className="text-xs" data-fold={k}>
              <span className="font-mono font-semibold">{k}</span>{" "}
              <span className="text-neutral-600 dark:text-neutral-400">
                ({chan.reducer})
              </span>
              <ol className="mt-0.5 space-y-0.5">
                {(seq as Obj[]).map((x, i) => (
                  <li
                    key={i}
                    className="rounded px-1 font-mono"
                    data-error={x.error ? "true" : "false"}
                    style={
                      x.error
                        ? {
                            background: HATCH,
                            outline: `1px solid ${STATE_COLOUR.stalled}`,
                          }
                        : undefined
                    }
                  >
                    + {x.node} {O.fmt(x.write)} →{" "}
                    {x.error ? "✗ InvalidUpdateError" : O.fmt(x.value)}
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Reducers({
  data,
  children,
}: {
  data: Obj;
  children?: ReactNode;
}): JSX.Element {
  const [name, setName] = useState<Session>("merge_add");
  const [hover, setHover] = useState<string | null>(null);
  const font = useSvgFont(W);
  const sess = data.sessions[name] as Obj;
  const ss = sess.supersteps as Obj;
  const frames = ss.frames as Obj[];
  const s = useStepper(frames.length, { stepMs: 1300, resetKey: name });
  const f = frames[s.step]!;
  const prev = s.step > 0 ? frames[s.step - 1]!.values : undefined;
  const hl =
    f.phase === "run" ? "snap" : f.phase === "barrier" ? "order" : "reduce";
  const focus = hover ?? hl;
  const visual = (
    <div className="mx-auto grid max-w-3xl gap-3 md:grid-cols-[3fr_2fr]">
      <div className="min-w-0">
        <GraphView
          layout={sess.layout}
          states={superstepStates(frames, s.step)}
          fired={firedEdges(f)}
          W={W}
          H={H}
          font={font}
          idPrefix="g2"
          badges={Object.fromEntries(
            (sess.graph.nodes as Obj[]).map((n) => [n.name, fmtMs(n.ms)]),
          )}
          label={`${sess.title}: super-step ${f.step}, ${f.phase}.`}
        />
        <div className="mt-2 rounded bg-white p-2 ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800">
          <Barrier f={f} sess={sess} />
        </div>
      </div>
      <StatePanel
        spec={sess.graph}
        values={f.values}
        prev={prev}
        title={
          f.phase === "halt" ? "State (unchanged: no checkpoint)" : "State"
        }
      />
    </div>
  );
  return (
    <AnimationPanel
      testId="reducer-widget"
      title="Two branches, one key, one reducer"
      summary="Parallel nodes cannot see each other's writes: they meet at the barrier, where each key's reducer folds them in a fixed order. Frames from the engine's runtime (checked against LangGraph)."
      stepper={s}
      stepLabel="frame"
      caption={f.caption}
      visual={visual}
      equation={children}
      hl={focus}
      onEquationHover={setHover}
      stats={
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat
            label="Outcome"
            value={ss.status === "done" ? "done" : "InvalidUpdateError"}
          />
          <Stat
            label="Checkpoints saved"
            value={String(frames.filter((x) => x.phase === "apply").length + 1)}
          />
          <Stat label="Graph time" value={fmtMs(ss.graph_ms)} />
        </div>
      }
      params={
        <Segmented
          label="Graph"
          value={name}
          options={SESSIONS}
          onChange={setName}
        />
      }
    />
  );
}
