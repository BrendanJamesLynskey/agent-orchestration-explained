"use client";

/**
 * Chapter 3: a thread's checkpoints on a timeline. Each operation (invoke, a crash, a resume, a
 * human's answer, update_state, time travel) adds checkpoints; the frames come from the engine's
 * `timelineFrames`, which replays the session on the runtime checked against LangGraph. The
 * timeline is a tree: x is the super-step, a fork or an edit starts a new lane. The graph above
 * shows the focused checkpoint: what has run, what is next, what failed or is paused; below it,
 * the focused checkpoint's state and the side effects so far.
 */
import { useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { Choice, Stat } from "@/components/ui/Controls";
import { GraphView } from "@/components/viz/GraphView";
import { StatePanel } from "@/components/viz/StatePanel";
import { useSvgFont } from "@/components/viz/useSvgFont";
import type { Obj } from "@/lib/engine";
import { checkpointStates, lanes } from "@/lib/orch/states";
import { SOURCE_COLOUR, STATE_COLOUR } from "@/lib/viz/palette";

import { EngineStatus } from "../agent/EngineStatus";
import { Hatch } from "./Hatch";
import { useEngine } from "./useEngine";

const W = 360;
const H = 130;
const TW = 360;
const SESSIONS = [
  { value: "crash", label: "A crash, then resume" },
  { value: "approval", label: "A human interrupt (interrupt())" },
  { value: "gated_edit", label: "A static interrupt and an edit" },
  { value: "fork", label: "Time travel: fork with update_state" },
  { value: "replay", label: "Time travel: replay a checkpoint" },
] as const;
type Session = (typeof SESSIONS)[number]["value"];

export default function CheckpointWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const st = useEngine("checkpoints");
  if (st.status !== "ready")
    return (
      <EngineStatus error={st.status === "error" ? st.error : undefined} />
    );
  return <Checkpoints data={st.data}>{children}</Checkpoints>;
}

function Checkpoints({
  data,
  children,
}: {
  data: Obj;
  children?: ReactNode;
}): JSX.Element {
  const [name, setName] = useState<Session>("crash");
  const [hover, setHover] = useState<string | null>(null);
  const font = useSvgFont(W);
  const tfont = useSvgFont(TW);
  const sess = data.sessions[name] as Obj;
  const tl = sess.timeline as Obj;
  const frames = tl.frames as Obj[];
  const s = useStepper(frames.length, { stepMs: 1300, resetKey: name });
  const f = frames[s.step]!;
  const op = (tl.ops as Obj[])[f.h]!;
  const hist = (op.history as Obj[]).slice(0, f.n);
  const full = op.history as Obj[];
  const lane = lanes(full);
  const nLanes = Math.max(1, ...Object.values(lane).map((x) => x + 1));
  const steps = full.map((c) => c.step as number);
  const minStep = Math.min(...steps);
  const maxStep = Math.max(...steps, minStep + 1);
  const TH = 46 + nLanes * 34;
  const cx = (st: number) =>
    22 + ((TW - 44) * (st - minStep)) / (maxStep - minStep);
  const cy = (l: number) => 26 + l * 34;
  const focus = f.focus as number | null;
  const shown = focus !== null ? full[focus] : undefined;
  const prevShown =
    shown && shown.parent !== null ? full[shown.parent] : undefined;
  // an operation's side effects and node runs count from its outcome frame on
  const upto = f.kind === "outcome" ? f.h : f.h - 1;
  const effects: string[] = [];
  let runs = 0;
  for (let i = 0; i <= upto; i++) {
    for (const e of (tl.ops as Obj[])[i]!.effects as string[]) effects.push(e);
    runs += ((tl.ops as Obj[])[i]!.calls as string[]).length;
  }
  const hasPending = (c: Obj) =>
    (c.tasks as Obj[]).some((t) => t.result !== null) &&
    c.id === (full.length ? full[full.length - 1]!.id : -1) &&
    f.kind === "outcome" &&
    f.status !== "done";
  const hl =
    f.kind === "outcome" && (f.status === "error" || f.status === "interrupted")
      ? "pending"
      : f.kind === "op" && "replay" in (op.op as Obj)
        ? "fork"
        : f.kind === "op" && "update" in (op.op as Obj)
          ? "fork"
          : "ckpt";
  const eqFocus = hover ?? hl;

  const visual = (
    <div className="mx-auto grid max-w-3xl gap-3 md:grid-cols-[3fr_2fr]">
      <div className="min-w-0">
        <GraphView
          layout={sess.layout}
          states={checkpointStates(
            full.slice(0, Math.max(f.n, (focus ?? -1) + 1)),
            focus,
            f.kind === "checkpoint",
          )}
          W={W}
          H={H}
          font={font}
          idPrefix="g3"
          label={`${sess.title}: ${f.caption}`}
        />
        <svg
          ref={tfont.ref}
          viewBox={`0 0 ${TW} ${TH}`}
          className="mt-2 h-auto w-full"
          role="img"
          aria-label={`The thread's checkpoints: ${hist.length} shown.`}
          data-testid="timeline"
        >
          <defs>
            <Hatch id="g3-cp-hatch" />
          </defs>
          <text
            x={6}
            y={11}
            style={{ fontSize: tfont.fs(9) }}
            className="fill-neutral-700 dark:fill-neutral-300"
          >
            Checkpoints by super-step (a new lane is a branch)
          </text>
          {hist.map((c) =>
            c.parent === null ? null : (
              <line
                key={`l${c.id}`}
                x1={cx(full[c.parent]!.step)}
                y1={cy(lane[c.parent]!)}
                x2={cx(c.step)}
                y2={cy(lane[c.id]!)}
                stroke="currentColor"
                strokeWidth={1.2}
                className="text-neutral-400 dark:text-neutral-500"
              />
            ),
          )}
          {hist.map((c) => {
            const err = (c.tasks as Obj[]).some(
              (t) => t.error && t.result === null,
            );
            const paused = (c.tasks as Obj[]).some(
              (t) => (t.interrupts as unknown[]).length && t.result === null,
            );
            const on = c.id === focus;
            return (
              <g
                key={c.id}
                data-cp={c.id}
                data-source={c.source}
                data-focus={on ? "true" : "false"}
              >
                <circle
                  cx={cx(c.step)}
                  cy={cy(lane[c.id]!)}
                  r={on ? 9 : 7}
                  fill={SOURCE_COLOUR[c.source]}
                  stroke={on ? STATE_COLOUR.active : "#ffffff"}
                  strokeWidth={on ? 3 : 1}
                />
                {(err || paused) && (
                  <rect
                    x={cx(c.step) + 6}
                    y={cy(lane[c.id]!) - 15}
                    width={12}
                    height={10}
                    rx={2}
                    fill={err ? "url(#g3-cp-hatch)" : STATE_COLOUR.paused}
                    stroke={err ? STATE_COLOUR.stalled : "none"}
                    data-mark={err ? "error" : "paused"}
                  />
                )}
                {hasPending(c) && (
                  <circle
                    cx={cx(c.step) - 9}
                    cy={cy(lane[c.id]!) - 10}
                    r={3}
                    fill={STATE_COLOUR.ok}
                    data-mark="pending"
                  />
                )}
                <text
                  x={cx(c.step)}
                  y={cy(lane[c.id]!) + 3.5}
                  textAnchor="middle"
                  style={{ fontSize: tfont.fs(8) }}
                  className="fill-white font-semibold"
                >
                  {c.id}
                </text>
              </g>
            );
          })}
          {Object.entries(SOURCE_COLOUR).map(([k, col], i) => (
            <g key={k} transform={`translate(${6 + i * 86},${TH - 22})`}>
              <circle cx={4} cy={-3} r={4} fill={col} />
              <text
                x={11}
                y={0}
                style={{ fontSize: tfont.fs(8) }}
                className="fill-neutral-700 dark:fill-neutral-300"
              >
                {k}
              </text>
            </g>
          ))}
          <g transform={`translate(6,${TH - 6})`}>
            <circle cx={4} cy={-3} r={3} fill={STATE_COLOUR.ok} />
            <text
              x={11}
              y={0}
              style={{ fontSize: tfont.fs(8) }}
              className="fill-neutral-700 dark:fill-neutral-300"
            >
              pending writes
            </text>
            <rect
              x={120}
              y={-8}
              width={10}
              height={8}
              fill="url(#g3-cp-hatch)"
              stroke={STATE_COLOUR.stalled}
            />
            <text
              x={134}
              y={0}
              style={{ fontSize: tfont.fs(8) }}
              className="fill-neutral-700 dark:fill-neutral-300"
            >
              error
            </text>
            <rect
              x={200}
              y={-8}
              width={10}
              height={8}
              fill={STATE_COLOUR.paused}
            />
            <text
              x={214}
              y={0}
              style={{ fontSize: tfont.fs(8) }}
              className="fill-neutral-700 dark:fill-neutral-300"
            >
              interrupted
            </text>
          </g>
        </svg>
      </div>
      <div className="min-w-0 space-y-2">
        {shown ? (
          <StatePanel
            spec={sess.graph}
            values={shown.values}
            prev={prevShown?.values}
            title={`Checkpoint ${shown.id} (step ${shown.step}, ${shown.source})`}
          />
        ) : (
          <p className="rounded bg-white p-2 text-xs ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800">
            No checkpoint in focus.
          </p>
        )}
        <div
          className="rounded bg-white p-2 text-xs ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800"
          data-testid="effects"
        >
          <p className="font-medium text-neutral-700 dark:text-neutral-300">
            Side effects so far ({effects.length})
          </p>
          <ul className="mt-1 font-mono">
            {effects.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
  return (
    <AnimationPanel
      testId="checkpoint-widget"
      title="Checkpoints, interrupts and time travel"
      summary="Every super-step saves a checkpoint; a crash or an interrupt keeps the finished siblings' writes; time travel branches the thread. The session runs on the engine's runtime, checked against LangGraph."
      stepper={s}
      stepLabel="event"
      caption={f.caption}
      visual={visual}
      equation={children}
      hl={eqFocus}
      onEquationHover={setHover}
      stats={
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label="Operation"
            value={`${f.h + 1} of ${(tl.ops as Obj[]).length}`}
          />
          <Stat label="Checkpoints" value={String(f.n)} />
          <Stat label="Node runs" value={String(runs)} />
          <Stat label="Side effects" value={String(effects.length)} />
        </div>
      }
      params={
        <Choice
          label="Session"
          value={name}
          options={SESSIONS}
          onChange={setName}
        />
      }
    />
  );
}
