"use client";

/**
 * Chapter 8: many workflows at once. Two hundred workflows of one pattern arrive at random
 * (Poisson) and share one rate-limited endpoint. The animation steps through the discrete-event
 * simulation in time: the queue in front of the endpoint, the calls in flight and the workflows in
 * the system; the latency histogram of the workflows finished so far with its percentiles; and,
 * from the load sweep, p95 latency against the arrival rate with each pattern's capacity, where the
 * knee is. Everything from the engine's `des` and `study` modules (the sweep is precomputed by the
 * same engine; a run at another rate is simulated in the page).
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { Segmented, Stat } from "@/components/ui/Controls";
import { useSvgFont } from "@/components/viz/useSvgFont";
import { O, type Obj } from "@/lib/engine";
import { fmtMs, fmtUsd, pct } from "@/lib/format";
import { finishedBy, histogram, nearestRank } from "@/lib/orch/des";
import {
  BRANCH_COLOUR,
  MUTED,
  OKABE_ITO,
  STATE_COLOUR,
} from "@/lib/viz/palette";

import { EngineStatus } from "../agent/EngineStatus";
import { useEngine } from "./useEngine";

const TW = 640;
const HW = 360;
const KW = 360;
const BINS = 20;
const LABEL: Record<string, string> = {
  single: "single",
  supervisor: "supervisor",
  map_reduce: "map-reduce",
  debate: "debate",
};

export default function ScaleWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const st = useEngine("scale");
  if (st.status !== "ready")
    return (
      <EngineStatus error={st.status === "error" ? st.error : undefined} />
    );
  return <Scale data={st.data}>{children}</Scale>;
}

function Scale({
  data,
  children,
}: {
  data: Obj;
  children?: ReactNode;
}): JSX.Element {
  const sweep = data.sweep as Obj[];
  const patterns = sweep.map((x) => x.pattern as string);
  const rates = (sweep[0]!.rows as Obj[]).map((_, i) => i);
  const rateVals = data.rates as number[];
  const [pattern, setPattern] = useState<string>("supervisor");
  const [rate, setRate] = useState<string>(String(data.detail_rate));
  const [hover, setHover] = useState<string | null>(null);
  const tfont = useSvgFont(TW);
  const hfont = useSvgFont(HW);
  const kfont = useSvgFont(KW);
  const detail = useMemo(
    () =>
      Number(rate) === data.detail_rate
        ? (data.details[pattern] as Obj)
        : O.study.scaleDetail(pattern, Number(rate)),
    [data.details, data.detail_rate, pattern, rate],
  );
  const series = detail.series as Obj[];
  const runs = detail.runs as Obj[];
  const s = useStepper(series.length, {
    stepMs: 160,
    resetKey: `${pattern}|${rate}`,
  });
  const fr = series[s.step]!;
  const t = fr.t as number;
  const cap = (sweep.find((x) => x.pattern === pattern)!.capacity as Obj)
    .min as number;
  const rho = Number(rate) / cap;
  const fin = finishedBy(runs, t);
  const lat = fin
    .filter((r) => r.status !== "exhausted")
    .map((r) => (r.end as number) - (r.arrival as number));
  const allLat = runs
    .filter((r) => r.status !== "exhausted")
    .map((r) => (r.end as number) - (r.arrival as number));
  const maxLat = Math.max(1, ...allLat);
  const hist = histogram(lat, maxLat, BINS);
  const p50 = nearestRank(lat, 50);
  const p95 = nearestRank(lat, 95);
  const p99 = nearestRank(lat, 99);
  const hl =
    s.step === series.length - 1 ? "tail" : fr.queue > 0 ? "rho" : "little";
  const focus = hover ?? hl;
  const okN = fin.filter((r) => r.status === "ok").length;
  const caption =
    `${fmtMs(t)}: ${fr.insys} workflows in the system, ${fr.queue} calls queued, ${fr.inflight} in flight; ` +
    `${fin.length} finished (${okN} correct)` +
    (s.step === series.length - 1
      ? `. p95 ${fmtMs(detail.p95)}, ${fmtUsd(detail.cost_per_success)} per success.`
      : ".");

  // time series
  const tf = tfont.fs(10);
  const X0 = tf * 2.4;
  const Y0 = tf + 4;
  const PW = TW - X0 - 8;
  const PH = 120;
  const TH = Y0 + PH + tf + 8;
  const horizon = series[series.length - 1]!.t as number;
  const yMax = Math.max(
    4,
    ...series.map((x) => Math.max(x.queue, x.insys, x.inflight)),
  );
  const xs = (v: number) => X0 + (PW * v) / (horizon || 1);
  const ys = (v: number) => Y0 + PH - (PH * v) / yMax;
  const upto = series.slice(0, s.step + 1);
  const path = (key: string) =>
    upto.map((x, i) => `${i ? "L" : "M"}${xs(x.t)},${ys(x[key])}`).join(" ");
  const area = upto.length
    ? `${path("queue")} L${xs(t)},${ys(0)} L${xs(0)},${ys(0)} Z`
    : "";

  // histogram
  const hf = hfont.fs(10);
  const HX0 = 4;
  const HPW = HW - 8;
  const HPH = 110;
  const HH = 6 + HPH + hf * 2.6;
  const hMax = Math.max(1, ...histogram(allLat, maxLat, BINS));
  const hx = (v: number) => HX0 + (HPW * v) / maxLat;

  // knee chart: p95 against the arrival rate, log y
  const kf = kfont.fs(10);
  const KX0 = kf * 3.4;
  const KY0 = 8;
  const KPW = KW - KX0 - 8;
  const KPH = 120;
  const KH = KY0 + KPH + kf * 2.8;
  const allP95 = sweep.flatMap((x) =>
    (x.rows as Obj[]).map((r) => r.p95 as number),
  );
  const lmin = Math.log10(Math.min(...allP95));
  const lmax = Math.log10(Math.max(...allP95));
  const kxi = (i: number) => KX0 + (KPW * i) / (rateVals.length - 1);
  const kxv = (v: number) => {
    for (let i = 0; i < rateVals.length - 1; i++)
      if (v <= rateVals[i + 1]!)
        return kxi(i + (v - rateVals[i]!) / (rateVals[i + 1]! - rateVals[i]!));
    return kxi(rateVals.length - 1);
  };
  const ky = (v: number) =>
    KY0 + KPH - (KPH * (Math.log10(v) - lmin)) / (lmax - lmin || 1);

  const visual = (
    <div className="space-y-3">
      <svg
        ref={tfont.ref}
        viewBox={`0 0 ${TW} ${TH}`}
        className="h-auto w-full"
        role="img"
        aria-label="Queue length, calls in flight and workflows in the system over time."
        data-testid="scale-series"
      >
        <line x1={X0} x2={X0} y1={Y0} y2={Y0 + PH} stroke={MUTED.light} />
        <line
          x1={X0}
          x2={X0 + PW}
          y1={Y0 + PH}
          y2={Y0 + PH}
          stroke={MUTED.light}
        />
        <text
          x={X0 - 3}
          y={Y0 + tf / 3}
          textAnchor="end"
          style={{ fontSize: tf }}
          className="fill-neutral-600 dark:fill-neutral-400"
        >
          {yMax}
        </text>
        <text
          x={X0 - 3}
          y={Y0 + PH}
          textAnchor="end"
          style={{ fontSize: tf }}
          className="fill-neutral-600 dark:fill-neutral-400"
        >
          0
        </text>
        <path
          d={area}
          fill={OKABE_ITO.vermillion}
          opacity={focus === "rho" ? 0.4 : 0.25}
          data-testid="queue-area"
        />
        <path
          d={path("insys")}
          fill="none"
          stroke={OKABE_ITO.black}
          strokeWidth={1.4}
          className="dark:stroke-neutral-200"
          data-focus={focus === "little" ? "true" : "false"}
        />
        <path
          d={path("inflight")}
          fill="none"
          stroke={STATE_COLOUR.active}
          strokeWidth={1.6}
        />
        <line
          x1={xs(t)}
          x2={xs(t)}
          y1={Y0}
          y2={Y0 + PH}
          stroke={OKABE_ITO.vermillion}
          strokeWidth={1}
        />
        <text
          x={X0}
          y={tf}
          style={{ fontSize: tf }}
          className="fill-neutral-600 dark:fill-neutral-400"
        >
          {LABEL[pattern]} at {rate}/min: queue (shaded), in flight (blue), in
          system (black)
        </text>
        <text
          x={X0 + PW}
          y={TH - 2}
          textAnchor="end"
          style={{ fontSize: tf }}
          className="fill-neutral-600 dark:fill-neutral-400"
        >
          {fmtMs(horizon)}
        </text>
      </svg>
      <div className="grid min-w-0 gap-3 md:grid-cols-2">
        <svg
          ref={hfont.ref}
          viewBox={`0 0 ${HW} ${HH}`}
          className="h-auto w-full"
          role="img"
          aria-label="Latency histogram of the workflows finished so far, with p50, p95 and p99."
          data-testid="latency-hist"
        >
          {hist.map((c, i) => (
            <rect
              key={i}
              x={HX0 + (HPW * i) / BINS + 0.5}
              y={6 + HPH - (HPH * c) / hMax}
              width={HPW / BINS - 1}
              height={(HPH * c) / hMax}
              fill={STATE_COLOUR.active}
              opacity={0.75}
            />
          ))}
          {lat.length > 0 &&
            [
              { v: p50, l: "p50" },
              { v: p95, l: "p95" },
              { v: p99, l: "p99" },
            ].map((m, i) => (
              <g
                key={m.l}
                data-focus={
                  focus === "tail" && m.l !== "p50" ? "true" : "false"
                }
              >
                <line
                  x1={hx(m.v)}
                  x2={hx(m.v)}
                  y1={6}
                  y2={6 + HPH}
                  stroke={
                    m.l === "p50" ? OKABE_ITO.green : OKABE_ITO.vermillion
                  }
                  strokeDasharray="3 2"
                  strokeWidth={1.4}
                />
                <text
                  x={Math.min(hx(m.v) + 2, HW - 30)}
                  y={6 + hf * (i + 1)}
                  style={{ fontSize: hf }}
                  className="fill-neutral-700 dark:fill-neutral-300"
                >
                  {m.l}
                </text>
              </g>
            ))}
          <line
            x1={HX0}
            x2={HX0 + HPW}
            y1={6 + HPH}
            y2={6 + HPH}
            stroke={MUTED.light}
          />
          <text
            x={HX0}
            y={HH - hf * 1.2}
            style={{ fontSize: hf }}
            className="fill-neutral-600 dark:fill-neutral-400"
          >
            0
          </text>
          <text
            x={HX0 + HPW}
            y={HH - hf * 1.2}
            textAnchor="end"
            style={{ fontSize: hf }}
            className="fill-neutral-600 dark:fill-neutral-400"
          >
            {fmtMs(maxLat)}
          </text>
          <text
            x={HX0 + HPW / 2}
            y={HH - 2}
            textAnchor="middle"
            style={{ fontSize: hf }}
            className="fill-neutral-600 dark:fill-neutral-400"
          >
            latency of finished workflows
          </text>
        </svg>
        <svg
          ref={kfont.ref}
          viewBox={`0 0 ${KW} ${KH}`}
          className="h-auto w-full"
          role="img"
          aria-label="p95 latency against the arrival rate for four patterns, with the selected pattern's capacity."
          data-testid="knee"
        >
          <line
            x1={KX0}
            x2={KX0}
            y1={KY0}
            y2={KY0 + KPH}
            stroke={MUTED.light}
          />
          <line
            x1={KX0}
            x2={KX0 + KPW}
            y1={KY0 + KPH}
            y2={KY0 + KPH}
            stroke={MUTED.light}
          />
          {[Math.pow(10, lmin), Math.pow(10, lmax)].map((v) => (
            <text
              key={v}
              x={KX0 - 3}
              y={ky(v) + kf / 3}
              textAnchor="end"
              style={{ fontSize: kf }}
              className="fill-neutral-600 dark:fill-neutral-400"
            >
              {fmtMs(v).replace(/ \d+ s$/, "")}
            </text>
          ))}
          {cap <= rateVals[rateVals.length - 1]! && (
            <line
              x1={kxv(cap)}
              x2={kxv(cap)}
              y1={KY0}
              y2={KY0 + KPH}
              stroke={OKABE_ITO.vermillion}
              strokeDasharray="4 3"
              strokeWidth={focus === "rho" ? 2.2 : 1.2}
              data-testid="capacity"
            />
          )}
          {sweep.map((x, j) => (
            <polyline
              key={x.pattern}
              points={(x.rows as Obj[])
                .map((r, i) => `${kxi(i)},${ky(r.p95)}`)
                .join(" ")}
              fill="none"
              stroke={BRANCH_COLOUR[j % BRANCH_COLOUR.length]}
              strokeWidth={x.pattern === pattern ? 2.6 : 1.2}
              opacity={x.pattern === pattern ? 1 : 0.55}
              data-pattern={x.pattern}
            />
          ))}
          {rates.map((i) => (
            <text
              key={i}
              x={kxi(i)}
              y={KY0 + KPH + kf + 2}
              textAnchor="middle"
              style={{ fontSize: kf }}
              className="fill-neutral-600 dark:fill-neutral-400"
            >
              {rateVals[i]}
            </text>
          ))}
          <circle
            cx={kxi(rateVals.indexOf(Number(rate)))}
            cy={ky(Math.max(detail.p95, Math.pow(10, lmin)))}
            r={4.5}
            fill="none"
            stroke={OKABE_ITO.black}
            strokeWidth={1.4}
            className="dark:stroke-neutral-200"
          />
          <text
            x={KX0 + KPW / 2}
            y={KH - 2}
            textAnchor="middle"
            style={{ fontSize: kf }}
            className="fill-neutral-600 dark:fill-neutral-400"
          >
            arrivals per minute (p95, log scale)
          </text>
        </svg>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-700 dark:text-neutral-300">
        {sweep.map((x, j) => (
          <li key={x.pattern} className="flex items-center gap-1">
            <span
              className="inline-block h-0.5 w-4"
              style={{ background: BRANCH_COLOUR[j % BRANCH_COLOUR.length] }}
            />
            {LABEL[x.pattern]}
          </li>
        ))}
        <li className="flex items-center gap-1">
          <span
            className="inline-block h-3 w-0 border-l-2 border-dashed"
            style={{ borderColor: OKABE_ITO.vermillion }}
          />
          capacity of {LABEL[pattern]}
        </li>
      </ul>
    </div>
  );

  return (
    <AnimationPanel
      testId="scale-widget"
      title="Two hundred workflows, one rate-limited endpoint"
      summary="Workflows arrive at random and share a queue, a concurrency limit and token buckets; failed calls are retried with jittered backoff. The engine's discrete-event simulation, stepped in time."
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
            label="Load ρ = λ / capacity"
            value={rho.toFixed(2)}
            hint={`capacity ${cap.toFixed(2)} workflows/min`}
            plain
          />
          <Stat
            label="Success"
            value={pct(detail.success, 1)}
            hint={`${detail.ok} of ${detail.workflows}`}
          />
          <Stat
            label="p50 / p95 / p99"
            value={`${fmtMs(detail.p50)} / ${fmtMs(detail.p95)} / ${fmtMs(detail.p99)}`}
          />
          <Stat
            label="Cost per success"
            value={fmtUsd(detail.cost_per_success)}
            hint={`utilisation ${pct(detail.utilisation)}`}
          />
        </div>
      }
      params={
        <>
          <Segmented
            label="Pattern"
            value={pattern}
            options={patterns.map((p) => ({ value: p, label: LABEL[p] ?? p }))}
            onChange={setPattern}
          />
          <Segmented
            label="Arrivals per minute, λ"
            value={rate}
            options={rateVals.map((v) => ({
              value: String(v),
              label: String(v),
            }))}
            onChange={setRate}
          />
        </>
      }
    />
  );
}
