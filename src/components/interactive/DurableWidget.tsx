"use client";

/**
 * Chapter 4: durable execution. An order workflow's code (left), the event history it writes
 * (middle) and the outside world (right: the payment service's ledger and the receipts sent).
 * Inject a fault: a crash after the charge, a crash inside it, or a lost reply; switch the
 * idempotency key; read the clock in the workflow code or record the choice as a marker. A new
 * worker replays the code against the history: recorded steps return their results without
 * running (ticked), and a step whose command differs from the history stops the replay. Frames
 * from the engine's `runDurable`.
 */
import { useState, type ReactNode } from "react";

import { AnimationPanel } from "@/components/anim/AnimationPanel";
import { useStepper } from "@/components/anim/useStepper";
import { Segmented, Stat } from "@/components/ui/Controls";
import type { Obj } from "@/lib/engine";
import { fmtMs } from "@/lib/format";
import { eventLabel } from "@/lib/orch/states";
import { EVENT_COLOUR, STATE_COLOUR } from "@/lib/viz/palette";

import { EngineStatus } from "../agent/EngineStatus";
import { useEngine } from "./useEngine";

const FAULTS = [
  { value: "none", label: "none" },
  { value: "crash_after_charge", label: "crash after charge" },
  { value: "crash_in_charge", label: "crash in charge" },
  { value: "crash_in_ship", label: "crash in shipping" },
  { value: "lost_reply", label: "lost reply" },
] as const;
type Fault = (typeof FAULTS)[number]["value"];
const KEYS = [
  { value: "nokey", label: "no key" },
  { value: "key", label: "idempotency key" },
] as const;
type Key = (typeof KEYS)[number]["value"];
const CHOOSE = [
  { value: "clock", label: "reads the clock" },
  { value: "marker", label: "recorded marker" },
] as const;
type Choose = (typeof CHOOSE)[number]["value"];
const QS = ["0.05", "0.1", "0.2", "0.3", "0.5"] as const;
const AS = ["1", "2", "3", "5"] as const;

const HATCH =
  "repeating-linear-gradient(45deg, rgb(213 94 0 / 0.18) 0 4px, transparent 4px 8px)";

export default function DurableWidget({
  children,
}: {
  children?: ReactNode;
}): JSX.Element {
  const st = useEngine("durable");
  if (st.status !== "ready")
    return (
      <EngineStatus error={st.status === "error" ? st.error : undefined} />
    );
  return <Durable data={st.data}>{children}</Durable>;
}

function Durable({
  data,
  children,
}: {
  data: Obj;
  children?: ReactNode;
}): JSX.Element {
  const [fault, setFault] = useState<Fault>("crash_in_charge");
  const [key, setKey] = useState<Key>("nokey");
  const [choose, setChoose] = useState<Choose>("marker");
  const [q, setQ] = useState<(typeof QS)[number]>("0.2");
  const [a, setA] = useState<(typeof AS)[number]>("3");
  const [hover, setHover] = useState<string | null>(null);
  const runKey = `${fault}|${key}|${choose}`;
  const run = data.runs[runKey] as Obj;
  const frames = run.frames as Obj[];
  const s = useStepper(frames.length, {
    stepMs: 1000,
    resetKey: `${runKey}|${q}|${a}`,
  });
  const f = frames[s.step]!;
  const history = run.history as Obj[];
  const steps = data.workflow.steps as Obj[];
  const sweep = (data.sweeps as Obj[]).find(
    (x) => x.q === Number(q) && x.attempts === Number(a),
  )!;
  const hl =
    f.kind === "effect" && f.effect === "dedup"
      ? "key"
      : f.kind === "effect" && f.effect === "charged" && f.attempt > 1
        ? "dup"
        : f.kind === "replay" || f.kind === "restart"
          ? "replay"
          : "attempts";
  const focus = hover ?? hl;
  const shownHistory = history.slice(0, f.hlen as number);
  // events the new worker has replayed so far: before the crash, and before its furthest replay cursor
  const crashAt = frames.find((x) => x.kind === "crash")?.hlen as
    | number
    | undefined;
  let replayedTo = 0;
  for (const x of frames.slice(0, s.step + 1))
    if (x.worker === 2 && x.mode === "replay")
      replayedTo = Math.max(replayedTo, x.cursor as number);

  const visual = (
    <div className="mx-auto grid max-w-4xl gap-3 md:grid-cols-3">
      <div
        className="min-w-0 rounded bg-white p-2 text-xs ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800"
        data-testid="code"
      >
        <p className="font-medium text-neutral-700 dark:text-neutral-300">
          Workflow code · worker {f.worker} ·{" "}
          <span
            data-mode={f.mode}
            className={
              f.mode === "replay"
                ? "rounded bg-sky-100 px-1 text-sky-900 dark:bg-sky-900 dark:text-sky-100"
                : ""
            }
          >
            {f.mode}
          </span>
        </p>
        <ol className="mt-1 space-y-0.5 font-mono">
          {steps.map((st, i) => (
            <li
              key={i}
              data-line={i}
              data-current={f.line === i ? "true" : "false"}
              className={`rounded px-1 ${f.line === i ? "bg-blue-100 font-semibold text-blue-950 dark:bg-blue-950 dark:text-blue-100" : ""}`}
            >
              {st.kind === "choose"
                ? choose === "clock"
                  ? "ship = clock() < cut-off ? …"
                  : "ship = marker(clock() < cut-off ? …)"
                : `${st.name}()`}
            </li>
          ))}
          <li
            data-line={steps.length}
            className={`rounded px-1 ${f.line === steps.length ? "bg-blue-100 font-semibold text-blue-950 dark:bg-blue-950 dark:text-blue-100" : ""}`}
          >
            return
          </li>
        </ol>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          clock: {fmtMs(f.t)}
        </p>
      </div>
      <div
        className="min-w-0 rounded bg-white p-2 text-xs ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800"
        data-testid="history"
      >
        <p className="font-medium text-neutral-700 dark:text-neutral-300">
          Event history ({shownHistory.length})
        </p>
        <ol className="mt-1 space-y-0.5 font-mono">
          {shownHistory.map((ev) => {
            const replayed =
              crashAt !== undefined &&
              (ev.i as number) < Math.min(crashAt, replayedTo) &&
              (ev.i as number) > 0;
            const bad = f.kind === "nondeterminism" && ev.i === f.cursor;
            return (
              <li
                key={ev.i}
                data-event={ev.i}
                data-replayed={replayed ? "true" : "false"}
                data-bad={bad ? "true" : "false"}
                className="flex gap-1 rounded px-1"
                style={
                  bad
                    ? {
                        background: HATCH,
                        outline: `1px solid ${STATE_COLOUR.stalled}`,
                      }
                    : undefined
                }
              >
                <span
                  className="inline-block w-2 shrink-0 rounded-sm"
                  style={{ background: EVENT_COLOUR[ev.type] }}
                />
                <span className="min-w-0 break-words">
                  {ev.i}. {eventLabel(ev, history)} {replayed ? "✓" : ""}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <div
        className="min-w-0 rounded bg-white p-2 text-xs ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800"
        data-testid="world"
      >
        <p className="font-medium text-neutral-700 dark:text-neutral-300">
          The outside world
        </p>
        <p className="mt-1 text-neutral-700 dark:text-neutral-300">
          Payment service ledger
        </p>
        <ul className="mt-0.5 space-y-0.5 font-mono">
          {(run.ledger as Obj[]).slice(0, f.charges as number).map((c, i) => (
            <li
              key={i}
              data-charge={i}
              className="rounded px-1"
              style={
                i > 0
                  ? {
                      background: HATCH,
                      outline: `1px solid ${STATE_COLOUR.stalled}`,
                    }
                  : undefined
              }
            >
              £{c.amount} · worker {c.worker} · attempt {c.attempt}
              {c.key ? ` · key ${c.key}` : ""}
              {i > 0 ? " · duplicate" : ""}
            </li>
          ))}
          {!(f.charges as number) && (
            <li className="text-neutral-600 dark:text-neutral-400">
              no charge yet
            </li>
          )}
        </ul>
        <p className="mt-2 text-neutral-700 dark:text-neutral-300">
          Receipts sent: {f.emails}
        </p>
      </div>
    </div>
  );
  return (
    <AnimationPanel
      testId="durable-widget"
      title="Replay, non-determinism and an idempotency key"
      summary="A worker dies; a new one replays the workflow's code against its event history. Recorded steps are not run again; a step that was running when the worker died is. Frames from the engine's durable-execution model."
      stepper={s}
      stepLabel="event"
      caption={f.caption}
      visual={visual}
      equation={children}
      hl={focus}
      onEquationHover={setHover}
      stats={
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Outcome" value={run.status} />
            <Stat label="Charges" value={`${run.charges} (£${run.charged})`} />
            <Stat label="Events" value={String(history.length)} />
            <Stat label="Finished at" value={fmtMs(run.t_end)} />
          </div>
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            data-testid="sweep"
          >
            <Stat
              label="Mean charges, no key"
              value={sweep.mean_no_key.toFixed(4)}
              hint={`closed form ${sweep.expected_no_key.toFixed(4)}`}
            />
            <Stat
              label="Charged twice or more"
              value={sweep.dup_rate.toFixed(4)}
              hint={`closed form ${sweep.expected_dup.toFixed(4)}`}
            />
            <Stat
              label="All attempts lost"
              value={(sweep.failed / sweep.runs).toFixed(4)}
              hint={`closed form ${sweep.expected_failed.toFixed(4)}`}
            />
            <Stat
              label="Mean charges, key"
              value={sweep.mean_key.toFixed(4)}
              hint={`${sweep.runs} orders, seed ${sweep.seed}`}
            />
          </div>
        </div>
      }
      params={
        <>
          <Segmented
            label="Fault"
            value={fault}
            options={FAULTS}
            onChange={setFault}
          />
          <Segmented
            label="Charge request"
            value={key}
            options={KEYS}
            onChange={setKey}
          />
          <Segmented
            label="Shipping choice"
            value={choose}
            options={CHOOSE}
            onChange={setChoose}
          />
          <div className="grid grid-cols-1 gap-2">
            <Segmented
              label="Sweep: reply lost with probability q"
              value={q}
              options={QS.map((v) => ({ value: v, label: v }))}
              onChange={setQ}
            />
            <Segmented
              label="Sweep: attempts A"
              value={a}
              options={AS.map((v) => ({ value: v, label: v }))}
              onChange={setA}
            />
          </div>
        </>
      }
    />
  );
}
