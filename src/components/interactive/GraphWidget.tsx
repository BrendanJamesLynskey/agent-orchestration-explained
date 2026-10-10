"use client";

/**
 * Chapter 1's hero: a request flowing through a graph, super-step by super-step. Each super-step
 * is three frames from the engine (`superstepFrames`): the triggered nodes run on one snapshot,
 * their writes wait at the barrier, then the reducers apply them, a checkpoint is saved and the
 * edges fire. Below the graph, the state after the frame and a time strip: each super-step lasts
 * as long as its slowest node (plus a checkpoint write), against running one node at a time.
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
import { MUTED, STATE_COLOUR } from "@/lib/viz/palette";

import { EngineStatus } from "../agent/EngineStatus";
import { useEngine } from "./useEngine";

const W = 360;
const H = 150;
const TW = 360;
const TH = 64;
const SESSIONS = [
  { value: "chain", label: "chain" },
  { value: "fanout", label: "fan-out" },
  { value: "react_loop", label: "agent loop" },
  { value: "loop_join", label: "loop + join" },
] as const;
type Session = (typeof SESSIONS)[number]["value"];

export default function GraphWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const st = useEngine("graph");
  if (st.status !== "ready")
    return (
      <EngineStatus error={st.status === "error" ? st.error : undefined} />
    );
  return <Graph data={st.data}>{children}</Graph>;
}

function Graph({
  data,
  children,
}: {
  data: Obj;
  children?: ReactNode;
}): JSX.Element {
  const [name, setName] = useState<Session>("fanout");
  const [hover, setHover] = useState<string | null>(null);
  const font = useSvgFont(W);
  const tfont = useSvgFont(TW);
  const sess = data.sessions[name] as Obj;
  const ss = sess.supersteps as Obj;
  const frames = ss.frames as Obj[];
  const s = useStepper(frames.length, { stepMs: 1100, resetKey: name });
  const f = frames[s.step]!;
  const prev = s.step > 0 ? frames[s.step - 1]!.values : undefined;
  const states = superstepStates(frames, s.step);
  const ms: Record<string, number> = {};
  for (const n of sess.graph.nodes as Obj[]) ms[n.name] = n.ms;
  const badges: Record<string, string> = {};
  for (const n of sess.graph.nodes as Obj[]) badges[n.name] = fmtMs(n.ms);
  const hl =
    f.phase === "run" ? "max" : f.phase === "barrier" ? "step" : "ckpt";
  const focus = hover ?? hl;

  // the time strip: one bar per super-step (its slowest task), the checkpoint write after it
  const applies = frames.filter((x) => x.phase === "apply");
  const total = Math.max(ss.graph_ms as number, ss.sequential_ms as number);
  const X0 = 8;
  const BW = TW - 16;
  const tx = (t: number) => X0 + (BW * t) / total;
  const curStep = f.step as number;

  const visual = (
    <div className="mx-auto grid max-w-3xl gap-3 md:grid-cols-[3fr_2fr]">
      <div className="min-w-0">
        <GraphView
          layout={sess.layout}
          states={states}
          fired={firedEdges(f)}
          W={W}
          H={H}
          font={font}
          idPrefix="g1"
          badges={badges}
          label={`${sess.title}: super-step ${f.step}, ${f.phase}. Running: ${(f.active as string[]).join(", ")}.`}
        />
        <svg
          ref={tfont.ref}
          viewBox={`0 0 ${TW} ${TH}`}
          className="mt-2 h-auto w-full"
          role="img"
          aria-label={`Time: the graph takes ${fmtMs(ss.graph_ms)}; one node at a time takes ${fmtMs(ss.sequential_ms)}.`}
        >
          <text
            x={X0}
            y={11}
            style={{ fontSize: tfont.fs(9) }}
            className="fill-neutral-700 dark:fill-neutral-300"
          >
            Super-steps ({fmtMs(ss.graph_ms)})
          </text>
          {applies.map((a) => {
            const x0 = tx((a.t as number) - (a.dur as number) - O.CKPT_MS);
            const x1 = tx((a.t as number) - O.CKPT_MS);
            const on = a.step === curStep;
            const past = (a.step as number) < curStep;
            return (
              <g
                key={a.step as number}
                data-strip-step={a.step}
                data-focus={focus === "max" && on ? "true" : "false"}
              >
                <rect
                  x={x0}
                  y={16}
                  width={Math.max(1, x1 - x0)}
                  height={14}
                  fill={
                    on
                      ? STATE_COLOUR.active
                      : past
                        ? MUTED.light
                        : "transparent"
                  }
                  stroke="currentColor"
                  strokeWidth={0.6}
                  className="text-neutral-500"
                />
                <rect
                  x={x1}
                  y={16}
                  width={Math.max(1, tx(a.t as number) - x1)}
                  height={14}
                  fill={STATE_COLOUR.paused}
                  opacity={focus === "ckpt" ? 1 : 0.6}
                />
              </g>
            );
          })}
          <text
            x={X0}
            y={45}
            style={{ fontSize: tfont.fs(9) }}
            className="fill-neutral-700 dark:fill-neutral-300"
          >
            One node at a time ({fmtMs(ss.sequential_ms)})
          </text>
          <rect
            x={X0}
            y={50}
            width={tx(ss.sequential_ms) - X0}
            height={10}
            fill={MUTED.light}
          />
        </svg>
      </div>
      <StatePanel spec={sess.graph} values={f.values} prev={prev} />
    </div>
  );

  return (
    <AnimationPanel
      testId="graph-widget"
      title="A request flowing through a graph"
      summary="Each super-step: the triggered nodes run on one snapshot, their writes wait at the barrier, then the reducers apply them and a checkpoint is saved. The engine's runtime, checked against LangGraph."
      stepper={s}
      stepLabel="frame"
      caption={f.caption}
      visual={visual}
      equation={children}
      hl={focus}
      onEquationHover={setHover}
      stats={
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Super-steps" value={String(ss.steps)} />
          <Stat label="Graph time" value={fmtMs(ss.graph_ms)} />
          <Stat label="One at a time" value={fmtMs(ss.sequential_ms)} />
          <Stat
            label="Speed-up"
            value={`${((ss.sequential_ms as number) / (ss.graph_ms as number)).toFixed(2)}×`}
          />
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
