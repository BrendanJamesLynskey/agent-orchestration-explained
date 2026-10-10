"use client";

/**
 * Chapter 5: six multi-agent patterns on the same task. The animation is the chosen pattern's call
 * plan on a timeline (uncontended): one lane per agent, each model call a bar that lights up while
 * it runs, tool calls in a thinner bar, and each agent's context growing at the right. Beside it,
 * every pattern's calls, cost, latency and probability of success on the same task. Plans,
 * schedules, frames and metrics from the engine's `patterns` module.
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { Choice, Segmented, Stat } from "@/components/ui/Controls";
import { useSvgFont } from "@/components/viz/useSvgFont";
import { O, type Obj } from "@/lib/engine";
import { fmtInt, fmtMs, fmtUsd, pct } from "@/lib/format";
import { SHORT, agentLabel, ticks } from "@/lib/orch/des";
import { MUTED, OKABE_ITO, STATE_COLOUR } from "@/lib/viz/palette";

import { EngineStatus } from "../agent/EngineStatus";
import { useEngine } from "./useEngine";

const W = 640;
const KS = ["4", "8", "16"] as const;
const RESULTS = ["700", "1500"] as const;
const SLOPES = [
  { value: "0", label: "none" },
  { value: "0.01", label: "0.01 / 1K" },
  { value: "0.02", label: "0.02 / 1K" },
] as const;
type Slope = (typeof SLOPES)[number]["value"];

export default function PatternsWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const st = useEngine("patterns");
  if (st.status !== "ready")
    return (
      <EngineStatus error={st.status === "error" ? st.error : undefined} />
    );
  return <Patterns data={st.data}>{children}</Patterns>;
}

function Patterns({
  data,
  children,
}: {
  data: Obj;
  children?: ReactNode;
}): JSX.Element {
  const P = O.patterns;
  const [pattern, setPattern] = useState<string>("supervisor");
  const [k, setK] = useState<(typeof KS)[number]>("4");
  const [rt, setRt] = useState<(typeof RESULTS)[number]>("700");
  const [slope, setSlope] = useState<Slope>("0.01");
  const [hover, setHover] = useState<string | null>(null);
  const font = useSvgFont(W);

  const { plan, frames, sched, rows, metrics } = useMemo(() => {
    const task = O.study.taskOf(Number(k), Number(rt));
    const model = O.study.modelOf(Number(slope));
    const plan = P.plan(pattern, task, model);
    const frames = P.patternFrames(plan);
    const metrics = P.metrics(plan);
    const row = (data.grid as Obj[]).find(
      (g) =>
        g.k === Number(k) &&
        g.result_tokens === Number(rt) &&
        g.slope === Number(slope),
    )!;
    return {
      plan,
      frames,
      sched: metrics.schedule as Obj[],
      rows: row.rows as Obj[],
      metrics,
    };
  }, [P, data.grid, pattern, k, rt, slope]);

  const s = useStepper(frames.length, {
    stepMs: 450,
    resetKey: `${pattern}|${k}|${rt}|${slope}`,
  });
  const f = frames[s.step]!;
  const agents = plan.agents as string[];
  const calls = plan.calls as Obj[];
  const tEnd = metrics.latency_ms as number;
  const active = new Set(f.active as number[]);
  const done = new Set(f.done as number[]);

  // layout: label column, timeline, context bars
  const fsz = font.fs(10);
  const lane = Math.max(20, fsz + 9);
  const maxLabel = Math.max(
    ...(plan.agents as string[]).map((a) => agentLabel(a, font.narrow).length),
  );
  const LX = Math.max(40, maxLabel * fsz * 0.6 + 8);
  const CX = W - (font.narrow ? 60 : 96);
  const TX = LX + 4;
  const TW = CX - TX - 10;
  const top = fsz + 8;
  const H = top + agents.length * lane + fsz + 14;
  const x = (t: number) => TX + (TW * t) / tEnd;
  const maxCtx = Math.max(
    1,
    ...calls.map((c) => (c.input as number) + (c.output as number)),
  );
  const ctx = f.ctx as Record<string, number>;
  const lastFrame = s.step === frames.length - 1;
  const hl = lastFrame
    ? "p"
    : (f.caption as string).includes("calls the model")
      ? "ctx"
      : "calls";
  const focus = hover ?? hl;
  const tickMs = ticks(tEnd / 1000, font.narrow ? 3 : 6).map((v) => v * 1000);

  const visual = (
    <div className="space-y-3">
      <svg
        ref={font.ref}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${plan.title}: ${agents.length} agents, ${metrics.model_calls} model calls on a timeline.`}
        data-testid="gantt"
      >
        <text
          x={TX}
          y={fsz}
          style={{ fontSize: fsz }}
          className="fill-neutral-600 dark:fill-neutral-400"
        >
          time →
        </text>
        <text
          x={CX}
          y={fsz}
          style={{ fontSize: fsz }}
          data-focus={focus === "ctx" ? "true" : "false"}
          className="fill-neutral-600 dark:fill-neutral-400"
        >
          {font.narrow ? "ctx" : "context"}
        </text>
        {agents.map((a, i) => {
          const y = top + i * lane;
          const w = ((ctx[a] ?? 0) / maxCtx) * (W - CX - 4);
          return (
            <g key={a} data-agent={a}>
              <text
                x={LX - 4}
                y={y + lane / 2 + fsz / 3}
                textAnchor="end"
                style={{ fontSize: fsz }}
                className="fill-neutral-700 dark:fill-neutral-300"
              >
                {agentLabel(a, font.narrow)}
              </text>
              <line
                x1={TX}
                x2={TX + TW}
                y1={y + lane / 2}
                y2={y + lane / 2}
                stroke={MUTED.light}
                strokeWidth={0.5}
                opacity={0.6}
              />
              <rect
                x={CX}
                y={y + 3}
                width={Math.max(0, w)}
                height={lane - 6}
                fill={OKABE_ITO.sky}
                opacity={focus === "ctx" ? 1 : 0.7}
                data-ctx={ctx[a] ?? 0}
              />
            </g>
          );
        })}
        {sched.map((sc) => {
          const c = calls[sc.id]!;
          const i = agents.indexOf(c.agent);
          const y = top + i * lane;
          const tool = c.kind === "tool";
          const h = tool ? (lane - 6) / 2 : lane - 6;
          const st = active.has(c.id)
            ? "active"
            : done.has(c.id)
              ? "done"
              : "future";
          const fill =
            st === "active"
              ? tool
                ? OKABE_ITO.orange
                : STATE_COLOUR.active
              : st === "done"
                ? tool
                  ? "#e9c27a"
                  : MUTED.light
                : "none";
          return (
            <rect
              key={sc.id}
              data-call={sc.id}
              data-state={st}
              x={x(sc.start)}
              y={y + (lane - h) / 2}
              width={Math.max(1.5, x(sc.end) - x(sc.start))}
              height={h}
              fill={fill}
              stroke={st === "future" ? MUTED.light : "none"}
              strokeWidth={0.8}
              rx={1.5}
            />
          );
        })}
        <line
          x1={x(f.t)}
          x2={x(f.t)}
          y1={top - 2}
          y2={top + agents.length * lane}
          stroke={OKABE_ITO.vermillion}
          strokeWidth={1.2}
          data-testid="playhead"
        />
        {tickMs.map((v) => (
          <text
            key={v}
            x={x(v)}
            y={H - 4}
            textAnchor="middle"
            style={{ fontSize: fsz }}
            className="fill-neutral-600 dark:fill-neutral-400"
          >
            {v / 1000} s
          </text>
        ))}
      </svg>
      <div
        className="grid grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] gap-x-1 gap-y-1 text-[11px] sm:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))] sm:gap-x-2 sm:text-xs"
        data-testid="compare"
      >
        <span className="font-medium text-neutral-600 dark:text-neutral-400">
          pattern
        </span>
        <span
          className="hidden font-medium text-neutral-600 sm:block dark:text-neutral-400"
          data-focus={focus === "calls" ? "true" : "false"}
        >
          calls
        </span>
        <span className="font-medium text-neutral-600 dark:text-neutral-400">
          cost
        </span>
        <span className="font-medium text-neutral-600 dark:text-neutral-400">
          time
        </span>
        <span
          className="font-medium text-neutral-600 dark:text-neutral-400"
          data-focus={focus === "p" ? "true" : "false"}
        >
          P(ok)
        </span>
        {rows.map((r) => {
          const on = r.pattern === pattern;
          const best = Math.max(...rows.map((x2) => x2.success as number));
          return (
            <Row
              key={r.pattern}
              on={on}
              best={r.success === best}
              cells={[
                SHORT[r.pattern] ?? r.pattern,
                String(r.model_calls),
                fmtUsd(r.cost),
                fmtMs(r.latency_ms),
                pct(r.success, 1),
              ]}
              bar={r.success as number}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <AnimationPanel
      testId="patterns-widget"
      title="Six patterns, one task"
      summary="The chosen pattern's model and tool calls on a timeline (one lane per agent, no queueing), each agent's context growing at the right; below, every pattern on the same task. Plans and numbers from the engine's patterns module."
      stepper={s}
      stepLabel="event"
      countFrom={0}
      caption={`${fmtMs(f.t)}: ${f.caption}`}
      visual={visual}
      equation={children}
      hl={focus}
      onEquationHover={setHover}
      stats={
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Stat label="Model calls" value={String(metrics.model_calls)} />
          <Stat
            label="Tokens in"
            value={fmtInt(metrics.input)}
            hint={`${fmtInt(metrics.cached)} cached`}
          />
          <Stat
            label="Cost so far"
            value={fmtUsd(f.cost)}
            hint={`of ${fmtUsd(metrics.cost)}`}
          />
          <Stat
            label="Latency"
            value={fmtMs(tEnd)}
            hint={`${fmtMs(metrics.serial_ms)} one call at a time`}
          />
          <Stat label="P(success)" value={pct(metrics.success, 1)} />
        </div>
      }
      params={
        <>
          <Choice
            label="Pattern"
            value={pattern}
            options={P.PATTERNS.map((p2) => ({
              value: p2,
              label: P.TITLES[p2]!,
            }))}
            onChange={setPattern}
          />
          <Segmented
            label="Sub-questions"
            value={k}
            options={KS.map((v) => ({ value: v, label: v }))}
            onChange={setK}
          />
          <Segmented
            label="Tool result (tokens)"
            value={rt}
            options={RESULTS.map((v) => ({ value: v, label: v }))}
            onChange={setRt}
          />
          <Segmented
            label="Accuracy lost per 1K tokens past 4K (illustrative)"
            value={slope}
            options={SLOPES}
            onChange={setSlope}
          />
        </>
      }
    />
  );
}

function Row({
  on,
  best,
  cells,
  bar,
}: {
  on: boolean;
  best: boolean;
  cells: string[];
  bar: number;
}): JSX.Element {
  const cls = `min-w-0 truncate rounded px-1 py-0.5 font-mono ${on ? "bg-blue-100 font-semibold text-blue-950 dark:bg-blue-950 dark:text-blue-100" : "text-neutral-800 dark:text-neutral-200"}`;
  return (
    <>
      {cells.map((c, i) => (
        <span
          key={i}
          className={i === 1 ? `${cls} hidden sm:block` : cls}
          data-best={i === 4 && best ? "true" : undefined}
          style={
            i === 4
              ? {
                  backgroundImage: `linear-gradient(to right, rgb(0 158 115 / 0.28) ${bar * 100}%, transparent ${bar * 100}%)`,
                }
              : undefined
          }
        >
          {c}
          {i === 4 && best ? " ★" : ""}
        </span>
      ))}
    </>
  );
}
