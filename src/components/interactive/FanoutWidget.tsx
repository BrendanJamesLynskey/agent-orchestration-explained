"use client";

/**
 * Chapter 6: map-reduce under a rate limit. A split call fans out one summarise call per chunk
 * (a Send each), then a reduce call; at most `width` calls run at once (LangGraph's
 * max_concurrency), and the endpoint's token buckets admit them. The animation is the
 * discrete-event simulation's trace in time: each call waits (hatched) and runs (blue); beside it,
 * the speed-up at every width against Amdahl's law and the bound the input-token bucket sets.
 * Traces and studies from the engine's `des` and `study` modules.
 */
import { useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { Hatch } from "@/components/interactive/Hatch";
import { Segmented, Stat } from "@/components/ui/Controls";
import { useSvgFont } from "@/components/viz/useSvgFont";
import type { Obj } from "@/lib/engine";
import { fmtInt, fmtMs } from "@/lib/format";
import { attemptState, moments, traceCounts } from "@/lib/orch/des";
import { MUTED, OKABE_ITO, STATE_COLOUR } from "@/lib/viz/palette";

import { EngineStatus } from "../agent/EngineStatus";
import { useEngine } from "./useEngine";

const W = 640;
const CW = 360;
const STEPS = 60;

export default function FanoutWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const st = useEngine("fanout");
  if (st.status !== "ready")
    return (
      <EngineStatus error={st.status === "error" ? st.error : undefined} />
    );
  return <Fanout data={st.data}>{children}</Fanout>;
}

function Fanout({
  data,
  children,
}: {
  data: Obj;
  children?: ReactNode;
}): JSX.Element {
  const fans = data.fans as Obj[];
  const widths = (fans[0]!.rows as Obj[]).map((r) => String(r.width));
  const itpms = fans.map((f) => String(f.itpm));
  const [width, setWidth] = useState<string>("8");
  const [itpm, setItpm] = useState<string>(itpms[0]!);
  const [hover, setHover] = useState<string | null>(null);
  const font = useSvgFont(W);
  const cfont = useSvgFont(CW);
  const fan = fans.find((f) => String(f.itpm) === itpm)!;
  const run = (fan.runs as Obj[]).find((r) => String(r.width) === width)!;
  const row = (fan.rows as Obj[]).find((r) => String(r.width) === width)!;
  const trace = run.trace as Obj[];
  const times = moments(run.ms as number, STEPS);
  const s = useStepper(times.length, {
    stepMs: 160,
    resetKey: `${width}|${itpm}`,
  });
  const t = times[s.step]!;
  const counts = traceCounts(trace, t);
  const hl = counts.queued > 0 ? "ceiling" : "amdahl";
  const focus = hover ?? hl;
  const chunks = fan.chunks as number;

  // the Gantt: one thin row per call (split, the chunks, reduce)
  const fsz = font.fs(10);
  const LX = Math.max(40, 9 * fsz * 0.6 + 6);
  const TX = LX + 6;
  const TW = W - TX - 8;
  const rowH = 7;
  const top = fsz + 6;
  const ncalls = (data.plan.calls as Obj[]).length;
  const GH = top + ncalls * rowH + fsz + 12;
  const tMax = Math.max(...(fan.runs as Obj[]).map((r) => r.ms as number));
  const x = (v: number) => TX + (TW * v) / tMax;
  const caption =
    `${fmtMs(t)}: ${counts.running} running, ${counts.queued} waiting for a slot or capacity, ` +
    `${counts.done} done (width ${width}, ${fmtInt(Number(itpm))} input tokens a minute)` +
    (s.step === times.length - 1
      ? `; finished in ${fmtMs(run.ms)}, ${row.speedup.toFixed(2)}× one call at a time.`
      : ".");

  // the speed-up chart
  const cf = cfont.fs(10);
  const CX0 = cf * 2.6;
  const CY0 = 8;
  const CPW = CW - CX0 - 8;
  const CPH = 150;
  const CH = CY0 + CPH + cf * 2.8;
  const rows = fan.rows as Obj[];
  const amdahlMax = rows[rows.length - 1]!.amdahl as number;
  const yMax = Math.ceil(
    Math.max(amdahlMax, ...rows.map((r) => r.speedup as number)) * 1.08,
  );
  const xi = (i: number) => CX0 + (CPW * i) / (rows.length - 1);
  const yv = (v: number) => CY0 + CPH - (CPH * Math.min(v, yMax)) / yMax;
  const f = fan.parallel_fraction as number;
  const curve: string[] = [];
  for (let i = 0; i <= (rows.length - 1) * 8; i++) {
    const n = Math.pow(2, i / 8);
    curve.push(`${xi(i / 8)},${yv(1 / (1 - f + f / n))}`);
  }
  const ceiling =
    fan.bound_ms > 0 ? (fan.t1 as number) / (fan.bound_ms as number) : 0;

  const visual = (
    <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          split → {chunks} × summarise (one <code>Send</code> each) → reduce
        </p>
        <svg
          ref={font.ref}
          viewBox={`0 0 ${W} ${GH}`}
          className="h-auto w-full"
          role="img"
          aria-label={`The ${ncalls} calls of a map-reduce over ${chunks} chunks on a timeline: waiting and running.`}
          data-testid="fan-gantt"
        >
          <defs>
            <Hatch id="fan-wait" />
          </defs>
          {[
            { label: "split", y: 0 },
            { label: `${chunks} chunks`, y: 1 + chunks / 2 - 1 },
            { label: "reduce", y: ncalls - 1 },
          ].map((g) => (
            <text
              key={g.label}
              x={LX}
              y={top + g.y * rowH + rowH}
              textAnchor="end"
              style={{ fontSize: fsz }}
              className="fill-neutral-700 dark:fill-neutral-300"
            >
              {g.label}
            </text>
          ))}
          {trace
            .filter((a) => a.outcome !== "tool")
            .map((a, i) => {
              const st = attemptState(a, t);
              if (st === "future") return null;
              const y = top + (a.call as number) * rowH;
              const qEnd = st === "queued" ? t : (a.start as number);
              const rEnd = st === "running" ? t : (a.end as number);
              return (
                <g key={i} data-call={a.call} data-state={st}>
                  {qEnd > a.queued && (
                    <rect
                      x={x(a.queued)}
                      y={y + 1}
                      width={x(qEnd) - x(a.queued)}
                      height={rowH - 2}
                      fill="url(#fan-wait)"
                      opacity={focus === "ceiling" ? 1 : 0.7}
                    />
                  )}
                  {st !== "queued" && (
                    <rect
                      x={x(a.start)}
                      y={y + 1}
                      width={Math.max(1, x(rEnd) - x(a.start))}
                      height={rowH - 2}
                      fill={
                        st === "running" ? STATE_COLOUR.active : MUTED.light
                      }
                    />
                  )}
                </g>
              );
            })}
          <line
            x1={x(t)}
            x2={x(t)}
            y1={top - 2}
            y2={top + ncalls * rowH}
            stroke={OKABE_ITO.vermillion}
            strokeWidth={1.2}
          />
          <line
            x1={x(run.ms)}
            x2={x(run.ms)}
            y1={top - 2}
            y2={top + ncalls * rowH}
            stroke={MUTED.light}
            strokeDasharray="3 3"
          />
          {[0, tMax / 2, tMax].map((v) => (
            <text
              key={v}
              x={Math.min(x(v), W - 4)}
              y={GH - 4}
              textAnchor={v === tMax ? "end" : v === 0 ? "start" : "middle"}
              style={{ fontSize: fsz }}
              className="fill-neutral-600 dark:fill-neutral-400"
            >
              {fmtMs(v)}
            </text>
          ))}
        </svg>
      </div>
      <svg
        ref={cfont.ref}
        viewBox={`0 0 ${CW} ${CH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Speed-up against width: measured, Amdahl's law and the rate-limit bound."
        data-testid="speedup"
      >
        <line x1={CX0} x2={CX0} y1={CY0} y2={CY0 + CPH} stroke={MUTED.light} />
        <line
          x1={CX0}
          x2={CX0 + CPW}
          y1={CY0 + CPH}
          y2={CY0 + CPH}
          stroke={MUTED.light}
        />
        {[0, Math.round(yMax / 2), yMax].map((v) => (
          <text
            key={v}
            x={CX0 - 3}
            y={yv(v) + cf / 3}
            textAnchor="end"
            style={{ fontSize: cf }}
            className="fill-neutral-600 dark:fill-neutral-400"
          >
            {v}×
          </text>
        ))}
        <polyline
          points={curve.join(" ")}
          fill="none"
          stroke={OKABE_ITO.green}
          strokeWidth={focus === "amdahl" ? 2.5 : 1.5}
          data-focus={focus === "amdahl" ? "true" : "false"}
        />
        {ceiling > 0 && ceiling < yMax && (
          <line
            x1={CX0}
            x2={CX0 + CPW}
            y1={yv(ceiling)}
            y2={yv(ceiling)}
            stroke={OKABE_ITO.vermillion}
            strokeDasharray="5 3"
            strokeWidth={focus === "ceiling" ? 2.5 : 1.5}
            data-focus={focus === "ceiling" ? "true" : "false"}
            data-testid="ceiling"
          />
        )}
        {rows.map((r, i) => (
          <g key={r.width}>
            <circle
              cx={xi(i)}
              cy={yv(r.speedup)}
              r={String(r.width) === width ? 5.5 : 3.5}
              fill={STATE_COLOUR.active}
              stroke={String(r.width) === width ? OKABE_ITO.black : "none"}
              strokeWidth={1.2}
              data-width={r.width}
            />
            <text
              x={xi(i)}
              y={CY0 + CPH + cf + 2}
              textAnchor="middle"
              style={{ fontSize: cf }}
              className="fill-neutral-600 dark:fill-neutral-400"
            >
              {r.width}
            </text>
          </g>
        ))}
        <text
          x={CX0 + CPW / 2}
          y={CH - 2}
          textAnchor="middle"
          style={{ fontSize: cf }}
          className="fill-neutral-600 dark:fill-neutral-400"
        >
          width (calls at once)
        </text>
      </svg>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-700 lg:col-span-2 dark:text-neutral-300">
        <li className="flex items-center gap-1">
          <span
            className="inline-block size-3 rounded-full"
            style={{ background: STATE_COLOUR.active }}
          />
          measured (simulated)
        </li>
        <li className="flex items-center gap-1">
          <span
            className="inline-block h-0.5 w-4"
            style={{ background: OKABE_ITO.green }}
          />
          Amdahl&apos;s law
        </li>
        <li className="flex items-center gap-1">
          <span
            className="inline-block h-0.5 w-4 border-t-2 border-dashed"
            style={{ borderColor: OKABE_ITO.vermillion }}
          />
          input-token bucket bound
        </li>
        <li className="flex items-center gap-1">
          <svg width="16" height="10" aria-hidden="true">
            <defs>
              <Hatch id="fan-wait-key" />
            </defs>
            <rect width="16" height="10" fill="url(#fan-wait-key)" />
          </svg>
          waiting (slot or capacity)
        </li>
      </ul>
    </div>
  );

  return (
    <AnimationPanel
      testId="fanout-widget"
      title="Fan-out under a rate limit"
      summary="A map-reduce over 32 chunks: a split call, one summarise call per chunk (a Send each), a reduce call, at most `width` at once, admitted by the endpoint's token buckets. Simulated by the engine's discrete-event model."
      stepper={s}
      stepLabel="moment"
      countFrom={0}
      caption={caption}
      visual={visual}
      equation={children}
      hl={focus}
      onEquationHover={setHover}
      stats={
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label="Run time"
            value={fmtMs(run.ms)}
            hint={`${fmtMs(fan.t1)} one at a time`}
          />
          <Stat label="Speed-up" value={`${row.speedup.toFixed(2)}×`} />
          <Stat
            label="Amdahl at this width"
            value={`${row.amdahl.toFixed(2)}×`}
            hint={`parallel fraction ${f.toFixed(3)}`}
          />
          <Stat
            label="Bucket bound"
            value={ceiling > 0 ? `${ceiling.toFixed(2)}×` : "none"}
            hint={`${fmtInt(fan.ceiling.tin)} uncached input tokens`}
          />
        </div>
      }
      params={
        <>
          <Segmented
            label="Width (calls at once)"
            value={width}
            options={widths.map((v) => ({ value: v, label: v }))}
            onChange={setWidth}
          />
          <Segmented
            label="Input tokens per minute (ITPM)"
            value={itpm}
            options={itpms.map((v) => ({ value: v, label: fmtInt(Number(v)) }))}
            onChange={setItpm}
          />
        </>
      }
    />
  );
}
