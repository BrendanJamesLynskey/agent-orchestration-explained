"use client";

/**
 * Chapter 9: choosing a pattern from the simulation, not from opinion. Every pattern's simulated
 * success (with its 95% interval), p95 latency, cost per success and capacity under the rate
 * limits, for a small and a large task; set the constraints, and the animation applies them one
 * at a time, striking out the patterns that miss each, then picks the most reliable survivor
 * (the cheaper one on a tie). Tables from the engine's `study.choose_table` (precomputed by the
 * same engine), the choice from `study.choose`.
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { Hatch } from "@/components/interactive/Hatch";
import { Segmented, Stat } from "@/components/ui/Controls";
import { useSvgFont } from "@/components/viz/useSvgFont";
import { O, type Obj } from "@/lib/engine";
import { fmtMs, fmtUsd, pct } from "@/lib/format";
import { chooseFrames } from "@/lib/orch/des";
import { MUTED, OKABE_ITO, STATE_COLOUR } from "@/lib/viz/palette";

import { EngineStatus } from "../agent/EngineStatus";
import { useEngine } from "./useEngine";

const W = 360;
const SUCCESS = [
  { value: "none", label: "any" },
  { value: "0.4", label: "≥ 40%" },
  { value: "0.8", label: "≥ 80%" },
] as const;
const P95 = [
  { value: "none", label: "any" },
  { value: "60000", label: "≤ 1 min" },
  { value: "180000", label: "≤ 3 min" },
] as const;
const COST = [
  { value: "none", label: "any" },
  { value: "0.2", label: "≤ $0.20" },
  { value: "0.6", label: "≤ $0.60" },
] as const;
const CAPACITY = [
  { value: "none", label: "any" },
  { value: "1", label: "≥ 1 / min" },
  { value: "2", label: "≥ 2 / min" },
] as const;
const KEY_LABEL: Record<string, string> = {
  success: "success",
  p95: "p95 latency",
  cost_per_success: "cost per success",
  capacity: "capacity",
};

function fmtLimit(key: string, v: number): string {
  if (key === "success") return pct(v);
  if (key === "p95") return fmtMs(v);
  if (key === "cost_per_success") return fmtUsd(v);
  return `${v} / min`;
}

export default function ChooserWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const st = useEngine("choose");
  if (st.status !== "ready")
    return (
      <EngineStatus error={st.status === "error" ? st.error : undefined} />
    );
  return <Chooser data={st.data}>{children}</Chooser>;
}

function Chooser({
  data,
  children,
}: {
  data: Obj;
  children?: ReactNode;
}): JSX.Element {
  const ks = Object.keys(data.tables as Obj);
  const [k, setK] = useState<string>(ks[ks.length - 1]!);
  const [succ, setSucc] = useState<string>("0.4");
  const [p95, setP95] = useState<string>("180000");
  const [cost, setCost] = useState<string>("none");
  const [capa, setCapa] = useState<string>("none");
  const [hover, setHover] = useState<string | null>(null);
  const font = useSvgFont(W);
  const table = data.tables[k] as Obj[];
  const titles = O.patterns.TITLES as Record<string, string>;
  const limits = useMemo(() => {
    const l: Record<string, number> = {};
    if (succ !== "none") l.success = Number(succ);
    if (p95 !== "none") l.p95 = Number(p95);
    if (cost !== "none") l.cost_per_success = Number(cost);
    if (capa !== "none") l.capacity = Number(capa);
    return l;
  }, [succ, p95, cost, capa]);
  const result = useMemo(() => O.study.choose(table, limits), [table, limits]);
  const frames = chooseFrames(
    result,
    table.map((r) => r.pattern as string),
  );
  const s = useStepper(frames.length, {
    stepMs: 1300,
    resetKey: `${k}|${succ}|${p95}|${cost}|${capa}`,
  });
  const f = frames[s.step]!;
  const struck = new Set(f.struck as string[]);
  const hl = f.kind === "pick" ? "pick" : "feas";
  const focus = hover ?? hl;
  const applied = new Set(
    frames
      .slice(1, s.step + 1)
      .filter((x) => x.kind === "constraint")
      .map((x) => x.step.key as string),
  );
  const rate = (data.rates as number[])[ks.indexOf(k)]!;
  const caption =
    f.kind === "start"
      ? `${table.length} patterns on a ${k}-sub-question task, ${data.workflows} simulated workflows each, arriving at ${rate} a minute.`
      : f.kind === "constraint"
        ? `${KEY_LABEL[f.step.key]} ${f.step.op === ">=" ? "at least" : "at most"} ${fmtLimit(f.step.key, f.step.limit)}: ` +
          ((f.step.struck as string[]).length
            ? `strikes out ${(f.step.struck as string[]).map((p) => titles[p]).join(", ")}`
            : "strikes out nothing") +
          `; ${(f.alive as string[]).length} left.`
        : f.pick
          ? `Pick: ${titles[f.pick]}, the most reliable pattern left (${pct(table.find((r) => r.pattern === f.pick)!.success, 1)}), at ${fmtUsd(table.find((r) => r.pattern === f.pick)!.cost_per_success)} per success.`
          : "No pattern meets every constraint: relax one (or change the task).";

  // scatter: cost per success (log x) against success
  const fs = font.fs(10);
  const X0 = fs * 3.2;
  const Y0 = 8;
  const PW = W - X0 - 10;
  const PH = 170;
  const H = Y0 + PH + fs * 2.8;
  const costs = table.map((r) => Math.max(1e-3, r.cost_per_success as number));
  const lmin = Math.log10(Math.min(...costs)) - 0.1;
  const lmax = Math.log10(Math.max(...costs)) + 0.1;
  const xv = (c: number) =>
    X0 + (PW * (Math.log10(Math.max(1e-3, c)) - lmin)) / (lmax - lmin);
  const yv = (p: number) => Y0 + PH - PH * p;

  const visual = (
    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <svg
        ref={font.ref}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Success against cost per success for each pattern, with the constraints applied so far."
        data-testid="choose-scatter"
      >
        <defs>
          <Hatch id="choose-out" />
        </defs>
        <line x1={X0} x2={X0} y1={Y0} y2={Y0 + PH} stroke={MUTED.light} />
        <line
          x1={X0}
          x2={X0 + PW}
          y1={Y0 + PH}
          y2={Y0 + PH}
          stroke={MUTED.light}
        />
        {[0, 0.5, 1].map((v) => (
          <text
            key={v}
            x={X0 - 3}
            y={yv(v) + fs / 3}
            textAnchor="end"
            style={{ fontSize: fs }}
            className="fill-neutral-600 dark:fill-neutral-400"
          >
            {pct(v)}
          </text>
        ))}
        {applied.has("success") && (
          <g data-focus={focus === "feas" ? "true" : "false"}>
            <rect
              x={X0}
              y={yv(limits.success!)}
              width={PW}
              height={PH - (yv(limits.success!) - Y0)}
              fill="url(#choose-out)"
              opacity={0.5}
            />
          </g>
        )}
        {applied.has("cost_per_success") &&
          limits.cost_per_success! < Math.pow(10, lmax) && (
            <rect
              x={Math.max(X0, xv(limits.cost_per_success!))}
              y={Y0}
              width={X0 + PW - Math.max(X0, xv(limits.cost_per_success!))}
              height={PH}
              fill="url(#choose-out)"
              opacity={0.5}
            />
          )}
        {table.map((r) => {
          const out = struck.has(r.pattern);
          const pick = f.kind === "pick" && f.pick === r.pattern;
          const cx = xv(r.cost_per_success);
          const cy = yv(r.success);
          return (
            <g
              key={r.pattern}
              data-pattern={r.pattern}
              data-out={out ? "true" : "false"}
            >
              <line
                x1={cx}
                x2={cx}
                y1={yv(r.ci[1])}
                y2={yv(r.ci[0])}
                stroke={out ? MUTED.light : OKABE_ITO.black}
                className={out ? "" : "dark:stroke-neutral-300"}
              />
              <circle
                cx={cx}
                cy={cy}
                r={pick ? 7 : 4.5}
                fill={out ? MUTED.light : STATE_COLOUR.active}
                stroke={pick ? OKABE_ITO.orange : "none"}
                strokeWidth={3}
              />
              <text
                x={cx + 7 > W - 70 ? cx - 7 : cx + 7}
                y={cy - 5}
                textAnchor={cx + 7 > W - 70 ? "end" : "start"}
                style={{ fontSize: fs }}
                className={
                  out
                    ? "fill-neutral-400 dark:fill-neutral-600"
                    : "fill-neutral-800 dark:fill-neutral-200"
                }
              >
                {(titles[r.pattern] ?? r.pattern).replace(" (hand-offs)", "")}
              </text>
            </g>
          );
        })}
        <text
          x={X0 + PW / 2}
          y={H - 2}
          textAnchor="middle"
          style={{ fontSize: fs }}
          className="fill-neutral-600 dark:fill-neutral-400"
        >
          cost per success (log scale) →
        </text>
      </svg>
      <div className="min-w-0 text-xs" data-testid="choose-table">
        <div className="grid grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))] gap-x-2 gap-y-1">
          {["pattern", "success", "p95", "$/success", "capacity"].map(
            (h, i) => {
              const key = [
                "",
                "success",
                "p95",
                "cost_per_success",
                "capacity",
              ][i]!;
              return (
                <span
                  key={h}
                  data-applied={applied.has(key) ? "true" : "false"}
                  className={`font-medium ${f.kind === "constraint" && f.step.key === key ? "rounded bg-blue-100 text-blue-950 dark:bg-blue-950 dark:text-blue-100" : "text-neutral-600 dark:text-neutral-400"}`}
                >
                  {h}
                </span>
              );
            },
          )}
          {table.map((r) => {
            const out = struck.has(r.pattern);
            const pick = f.kind === "pick" && f.pick === r.pattern;
            const cls = `min-w-0 truncate rounded px-1 py-0.5 font-mono ${out ? "text-neutral-400 line-through dark:text-neutral-600" : pick ? "bg-amber-100 font-semibold text-amber-950 dark:bg-amber-950 dark:text-amber-100" : "text-neutral-800 dark:text-neutral-200"}`;
            const style = out
              ? {
                  backgroundImage:
                    "repeating-linear-gradient(45deg, rgb(213 94 0 / 0.14) 0 4px, transparent 4px 8px)",
                }
              : undefined;
            return (
              <div
                key={r.pattern}
                className="contents"
                data-row={r.pattern}
                data-out={out ? "true" : "false"}
                data-pick={pick ? "true" : "false"}
              >
                <span className={cls} style={style}>
                  {pick ? "★ " : ""}
                  {(titles[r.pattern] ?? r.pattern).replace(" (hand-offs)", "")}
                </span>
                <span className={cls} style={style}>
                  {pct(r.success, 1)}
                </span>
                <span className={cls} style={style}>
                  {fmtMs(r.p95)}
                </span>
                <span className={cls} style={style}>
                  {fmtUsd(r.cost_per_success)}
                </span>
                <span className={cls} style={style}>
                  {(r.capacity as number).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Success: simulated, with its 95% interval on the chart; capacity:
          workflows a minute the rate limits allow.
        </p>
      </div>
    </div>
  );

  const pickRow = result.pick
    ? table.find((r) => r.pattern === result.pick)
    : null;
  return (
    <AnimationPanel
      testId="chooser-widget"
      title="Choosing a pattern from the simulation"
      summary="Every pattern simulated on the same task and load; the constraints are applied one at a time, and the most reliable survivor is picked. Tables from the engine's discrete-event simulation."
      stepper={s}
      stepLabel="step"
      countFrom={0}
      caption={caption}
      visual={visual}
      equation={children}
      hl={focus}
      onEquationHover={setHover}
      stats={
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label="Constraints"
            value={String(Object.keys(limits).length)}
          />
          <Stat
            label="Patterns left"
            value={`${(result.alive as string[]).length} of ${table.length}`}
          />
          <Stat
            label="Pick"
            value={pickRow ? titles[pickRow.pattern]! : "none"}
          />
          <Stat
            label="Its success"
            value={pickRow ? pct(pickRow.success, 1) : "–"}
            hint={
              pickRow
                ? `${fmtUsd(pickRow.cost_per_success)} per success`
                : undefined
            }
          />
        </div>
      }
      params={
        <>
          <Segmented
            label="Task: sub-questions"
            value={k}
            options={ks.map((v) => ({ value: v, label: v }))}
            onChange={setK}
          />
          <Segmented
            label="Success"
            value={succ}
            options={SUCCESS}
            onChange={setSucc}
          />
          <Segmented
            label="p95 latency"
            value={p95}
            options={P95}
            onChange={setP95}
          />
          <Segmented
            label="Cost per success"
            value={cost}
            options={COST}
            onChange={setCost}
          />
          <Segmented
            label="Capacity (workflows a minute)"
            value={capa}
            options={CAPACITY}
            onChange={setCapa}
          />
        </>
      }
    />
  );
}
