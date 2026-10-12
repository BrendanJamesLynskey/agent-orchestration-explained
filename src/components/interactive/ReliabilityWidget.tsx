"use client";

/**
 * Chapter 7: reliability. Forty-eight simulated runs of a ten-step workflow, step by step: each
 * cell is a step's outcome (correct, silently wrong, or given up after its attempts), with a tick
 * per extra attempt. Beside it, P(success) against the number of steps for one attempt, retries,
 * and retries with a verifier: the closed forms as lines, the simulation (2,000 runs a point) as
 * dots with 95% Wilson intervals. Runs and closed forms from the engine's `reliability` module.
 */
import { useMemo, useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { Hatch } from "@/components/interactive/Hatch";
import { Segmented, Stat } from "@/components/ui/Controls";
import { useSvgFont } from "@/components/viz/useSvgFont";
import { O, type Obj } from "@/lib/engine";
import { pct } from "@/lib/format";
import { gridAt, stepSummary } from "@/lib/orch/des";
import { MUTED, OKABE_ITO, STATE_COLOUR } from "@/lib/viz/palette";

import { EngineStatus } from "../agent/EngineStatus";
import { useEngine } from "./useEngine";

const GW = 360;
const CW = 360;
const CONFIG_COLOUR: Record<string, string> = {
  none: OKABE_ITO.vermillion,
  retry: OKABE_ITO.blue,
  verify: OKABE_ITO.green,
};

export default function ReliabilityWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const st = useEngine("reliability");
  if (st.status !== "ready")
    return (
      <EngineStatus error={st.status === "error" ? st.error : undefined} />
    );
  return <Reliability data={st.data}>{children}</Reliability>;
}

function Reliability({
  data,
  children,
}: {
  data: Obj;
  children?: ReactNode;
}): JSX.Element {
  const configs = data.configs as Obj[];
  const rel = data.rel as Obj;
  const [cfg, setCfg] = useState<string>("retry");
  const [e, setE] = useState<string>(String(rel.e));
  const [w, setW] = useState<string>(String(rel.w));
  const [hover, setHover] = useState<string | null>(null);
  const gfont = useSvgFont(GW);
  const cfont = useSvgFont(CW);
  const studies = useMemo(
    () =>
      Number(e) === rel.e && Number(w) === rel.w
        ? (data.studies as Obj[])
        : configs.map((c) => O.study.relStudy(Number(e), Number(w), c)),
    [data.studies, configs, rel, e, w],
  );
  const study = studies.find((x) => x.name === cfg)!;
  const kept = study.grid.kept as Obj[];
  const n = study.grid.n as number;
  const s = useStepper(n + 1, { stepMs: 900, resetKey: `${cfg}|${e}|${w}` });
  const k = s.step;
  const g = gridAt(kept, k);
  const sum = k > 0 ? stepSummary(kept, k) : null;
  const hl =
    sum && sum.caught! > 0
      ? "d"
      : sum && sum.error! > 0 && study.attempts > 1
        ? "a"
        : "n";
  const focus = hover ?? hl;
  const okAll = kept.filter((r) => r.status === "ok").length;
  const caption =
    k === 0
      ? `${kept.length} runs of a ${n}-step workflow with ${study.label}: each attempt fails visibly with probability ${e} and is silently wrong with probability ${w}.`
      : k < n
        ? `Step ${k}: ${sum!.reached} runs reach it; ${sum!.error} attempts fail visibly${study.attempts > 1 ? " and are retried" : ""}` +
          (study.verifier
            ? `, the verifier catches ${sum!.caught} wrong results and rejects ${sum!.rejected_ok} right ones`
            : "") +
          `; ${sum!.wrong} wrong results go through unnoticed, ${sum!.gave_up} runs give up. ${g.alive} of ${kept.length} are still correct.`
        : `After ${n} steps ${okAll} of ${kept.length} runs are correct (closed form for any one run: ${pct(study.grid.closed.success, 1)}; the chart's dots simulate ${rel.runs} runs a point).`;

  // grid layout
  const gf = gfont.fs(10);
  const LX = gf * 2.2;
  const cellW = (GW - LX - 46) / n;
  const cellH = 5.5;
  const gtop = gf + 6;
  const GH = gtop + kept.length * cellH + 6;

  // chart layout
  const cf = cfont.fs(10);
  const ns = study.curve.map((c: Obj) => c.n as number);
  const X0 = cf * 3;
  const Y0 = 8;
  const PW = CW - X0 - 10;
  const PH = 150;
  const CH = Y0 + PH + cf * 2.8;
  const xi = (i: number) => X0 + (PW * i) / (ns.length - 1);
  const yv = (v: number) => Y0 + PH - PH * v;

  const visual = (
    <div className="grid min-w-0 gap-3 md:grid-cols-2">
      <svg
        ref={gfont.ref}
        viewBox={`0 0 ${GW} ${GH}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${kept.length} simulated runs of ${n} steps: each step's outcome.`}
        data-testid="runs-grid"
      >
        <defs>
          <Hatch id="rel-wrong" colour={OKABE_ITO.purple} />
          <Hatch id="rel-gave" />
        </defs>
        <text
          x={LX}
          y={gf}
          style={{ fontSize: gf }}
          className="fill-neutral-600 dark:fill-neutral-400"
        >
          step 1 → {n}
        </text>
        <text
          x={GW - 2}
          y={gf}
          textAnchor="end"
          style={{ fontSize: gf }}
          className="fill-neutral-600 dark:fill-neutral-400"
        >
          {g.alive} ok
        </text>
        {k > 0 && (
          <rect
            x={LX + (k - 1) * cellW}
            y={gtop - 2}
            width={cellW}
            height={kept.length * cellH + 3}
            fill="none"
            stroke={OKABE_ITO.black}
            strokeWidth={0.8}
            className="dark:stroke-neutral-300"
          />
        )}
        {g.cells.map((row, r) =>
          row.map((c, i) => {
            if (!c) return null;
            const y = gtop + r * cellH;
            const fill =
              c === "ok"
                ? STATE_COLOUR.ok
                : c === "wrong"
                  ? "url(#rel-wrong)"
                  : "url(#rel-gave)";
            const tries = g.tries[r]![i]!;
            return (
              <g key={`${r}-${i}`} data-cell={`${r}-${i}`} data-outcome={c}>
                <rect
                  x={LX + i * cellW + 0.5}
                  y={y + 0.4}
                  width={cellW - 1}
                  height={cellH - 0.8}
                  fill={fill}
                  opacity={c === "ok" ? 0.55 : 1}
                />
                {tries > 1 &&
                  Array.from({ length: tries - 1 }, (_, j) => (
                    <rect
                      key={j}
                      x={LX + i * cellW + 2 + j * 4}
                      y={y + 1.2}
                      width={2}
                      height={cellH - 2.4}
                      fill={OKABE_ITO.black}
                      opacity={focus === "a" ? 0.9 : 0.55}
                    />
                  ))}
              </g>
            );
          }),
        )}
        {kept.map((run, r) => {
          const row = g.cells[r]!;
          const dead = row.includes("gave_up") || row.includes("wrong");
          return (
            <rect
              key={r}
              x={GW - 40}
              y={gtop + r * cellH + 0.6}
              width={k === 0 ? 0 : dead ? 4 : 36}
              height={cellH - 1.2}
              fill={dead ? MUTED.light : STATE_COLOUR.ok}
              opacity={0.8}
            />
          );
        })}
      </svg>
      <svg
        ref={cfont.ref}
        viewBox={`0 0 ${CW} ${CH}`}
        className="h-auto w-full"
        role="img"
        aria-label="P(success) against the number of steps: closed forms and simulation with 95% intervals."
        data-testid="rel-chart"
      >
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
            y={yv(v) + cf / 3}
            textAnchor="end"
            style={{ fontSize: cf }}
            className="fill-neutral-600 dark:fill-neutral-400"
          >
            {v}
          </text>
        ))}
        {studies.map((st: Obj) => (
          <polyline
            key={st.name}
            points={(st.curve as Obj[])
              .map((c, i) => `${xi(i)},${yv(c.closed)}`)
              .join(" ")}
            fill="none"
            stroke={CONFIG_COLOUR[st.name]}
            strokeWidth={st.name === cfg ? 2.5 : 1.2}
            opacity={st.name === cfg ? 1 : 0.6}
            data-config={st.name}
          />
        ))}
        {(study.curve as Obj[]).map((c, i) => (
          <g key={c.n} data-n={c.n}>
            <line
              x1={xi(i)}
              x2={xi(i)}
              y1={yv(c.ci[1])}
              y2={yv(c.ci[0])}
              stroke={OKABE_ITO.black}
              strokeWidth={1}
              className="dark:stroke-neutral-300"
            />
            <circle
              cx={xi(i)}
              cy={yv(c.rate)}
              r={c.n === n ? 4.5 : 3}
              fill={CONFIG_COLOUR[cfg]}
              stroke={c.n === n && k === n ? OKABE_ITO.black : "none"}
              data-focus={focus === "n" && c.n === n ? "true" : "false"}
            />
            <text
              x={xi(i)}
              y={Y0 + PH + cf + 2}
              textAnchor="middle"
              style={{ fontSize: cf }}
              className="fill-neutral-600 dark:fill-neutral-400"
            >
              {cfont.narrow && i % 2 === 1 ? "" : c.n}
            </text>
          </g>
        ))}
        <text
          x={X0 + PW / 2}
          y={CH - 2}
          textAnchor="middle"
          style={{ fontSize: cf }}
          className="fill-neutral-600 dark:fill-neutral-400"
        >
          steps n
        </text>
      </svg>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-700 md:col-span-2 dark:text-neutral-300">
        {configs.map((c) => (
          <li key={c.name} className="flex items-center gap-1">
            <span
              className="inline-block h-0.5 w-4"
              style={{ background: CONFIG_COLOUR[c.name] }}
            />
            {c.label}
          </li>
        ))}
        <li className="flex items-center gap-1">
          <span
            className="inline-block size-3"
            style={{ background: STATE_COLOUR.ok, opacity: 0.55 }}
          />
          correct
        </li>
        <li className="flex items-center gap-1">
          <svg width="16" height="10" aria-hidden="true">
            <defs>
              <Hatch id="rel-wrong-key" colour={OKABE_ITO.purple} />
            </defs>
            <rect width="16" height="10" fill="url(#rel-wrong-key)" />
          </svg>
          silently wrong
        </li>
        <li className="flex items-center gap-1">
          <svg width="16" height="10" aria-hidden="true">
            <defs>
              <Hatch id="rel-gave-key" />
            </defs>
            <rect width="16" height="10" fill="url(#rel-gave-key)" />
          </svg>
          gave up
        </li>
        <li className="flex items-center gap-1">
          <span className="inline-block h-3 w-0.5 bg-black dark:bg-neutral-300" />
          one more attempt
        </li>
      </ul>
    </div>
  );

  const at10 = (study.curve as Obj[]).find((c) => c.n === n)!;
  return (
    <AnimationPanel
      testId="reliability-widget"
      title="Success decays with steps; retries and a verifier push it back"
      summary="Forty-eight seeded runs of a ten-step workflow, one step at a time, and P(success) against the number of steps: closed forms as lines, simulations as dots with 95% intervals. From the engine's reliability module."
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
            label={`P(success), ${n} steps`}
            value={pct(at10.closed, 1)}
            hint="closed form"
          />
          <Stat
            label="Simulated"
            value={pct(at10.rate, 1)}
            hint={`95% CI ${pct(at10.ci[0], 1)} to ${pct(at10.ci[1], 1)}`}
          />
          <Stat
            label="Attempts per run"
            value={at10.attempts.toFixed(2)}
            hint={`closed form ${at10.closed_attempts.toFixed(2)}`}
          />
          <Stat
            label="Correct in this grid"
            value={`${okAll} / ${kept.length}`}
          />
        </div>
      }
      params={
        <>
          <Segmented
            label="Each step gets"
            value={cfg}
            options={configs.map((c) => ({
              value: c.name as string,
              label: c.label as string,
            }))}
            onChange={setCfg}
          />
          <Segmented
            label="Visible error per attempt, e"
            value={e}
            options={["0.02", "0.05", "0.1"].map((v) => ({
              value: v,
              label: v,
            }))}
            onChange={setE}
          />
          <Segmented
            label="Silent error per attempt, w"
            value={w}
            options={["0.01", "0.03", "0.05"].map((v) => ({
              value: v,
              label: v,
            }))}
            onChange={setW}
          />
        </>
      }
    />
  );
}
