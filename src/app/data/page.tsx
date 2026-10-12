/**
 * /data: the LangGraph conformance sessions (what was compared, with which version), and every
 * result the chapters quote, computed by the engine at build time. Server Component.
 */
import RECORDING from "@/data/langgraph_recordings.json";
import type { Obj } from "@/lib/engine";
import VENDORED from "@/lib/engine/vendor/VENDORED.json";
import { fmtInt, fmtMs, fmtUsd, pct } from "@/lib/format";
import { formatValue, lookup } from "@/lib/orch/values";
import {
  ENGINE_URL,
  LANGGRAPH_PYPI,
  PREGEL_DOI,
  TEMPORAL_WORKFLOWS,
} from "@/lib/site";

export const metadata = {
  title: "Data",
  description:
    "The LangGraph conformance sessions (langgraph 1.2.14, every checkpoint compared), the super-step timings of the teaching graphs, every durable-execution run and seeded sweep, the multi-agent patterns, fan-out under a rate limit, reliability against its closed forms, the load sweep and the chooser's tables.",
};

const A =
  "focus-ring rounded text-accent underline underline-offset-2 dark:text-indigo-300";
const TH = "py-1 pr-3 font-medium";
const TD = "py-1 pr-3 font-mono";

function Scroll({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div
      className="focus-ring overflow-x-auto"
      tabIndex={0}
      role="region"
      aria-label="Scrollable table"
    >
      {children}
    </div>
  );
}

function opText(op: Obj): string {
  const fail =
    op.fail && (op.fail as string[]).length
      ? ` (crash ${(op.fail as string[]).join(", ")})`
      : "";
  const lim = op.limit ? ` (limit ${op.limit})` : "";
  if ("invoke" in op) return `invoke${fail}${lim}`;
  if ("resume" in op) return "resume";
  if ("continue" in op) return `continue${fail}${lim}`;
  if ("replay" in op) return `replay ${op.replay}`;
  return `update ${op.at} as ${op.as_node}`;
}

export default function DataPage(): JSX.Element {
  const v = (path: string, fmt: Parameters<typeof formatValue>[1]) =>
    formatValue(lookup(path), fmt);
  const rec = RECORDING as Obj;
  const graphs = lookup("graph.sessions") as Obj;
  const runs = lookup("durable_summary") as Obj;
  const sweeps = lookup("durable.sweeps") as Obj[];
  const pat = lookup("pat") as Obj;
  const fans = lookup("fanout.fans") as Obj[];
  const rel = lookup("reliability.studies") as Obj[];
  const load = lookup("scale.sweep") as Obj[];
  const rates = lookup("scale.rates") as number[];
  const tables = lookup("choose.tables") as Obj;
  const commit = VENDORED.commit;
  const engineFile = (p: string) => `${ENGINE_URL}/blob/${commit}/${p}`;
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-accent dark:text-indigo-300">
        /data
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Conformance and results
      </h1>
      <div className="mdx-content mt-6">
        <p>
          Everything here is computed by the vendored engine when the site is
          built, from the engine at commit <code>{commit.slice(0, 7)}</code>;
          the engine&apos;s own recorded runs are{" "}
          <a
            href={engineFile("fixtures/orchestration_results.md")}
            className={A}
          >
            orchestration_results.md
          </a>{" "}
          (chapters 1–4) and{" "}
          <a
            href={engineFile("fixtures/orchestration2_results.md")}
            className={A}
          >
            orchestration2_results.md
          </a>{" "}
          (chapters 5–9). Every token size, accuracy, rate limit, failure rate
          and timing in chapters 5–9 is illustrative.
        </p>

        <h2>LangGraph conformance</h2>
        <p>
          Recorded with{" "}
          <a href={LANGGRAPH_PYPI} className={A}>
            langgraph {v("conformance.langgraph", "raw")}
          </a>{" "}
          (langgraph-checkpoint {v("conformance.checkpoint", "raw")}, an
          in-memory checkpointer) by{" "}
          <a href={engineFile("scripts/record_langgraph.py")} className={A}>
            record_langgraph.py
          </a>{" "}
          from graphs built by{" "}
          <a href={engineFile("conformance/langgraph_graphs.py")} className={A}>
            langgraph_graphs.py
          </a>
          ; the recording is{" "}
          <a
            href={engineFile("fixtures/langgraph_recordings.json")}
            className={A}
          >
            langgraph_recordings.json
          </a>
          . After every operation the full checkpoint history (step, source,
          parent, state, next tasks, each task&apos;s result, error and
          interrupts), the outcome, the node runs and the side effects are
          compared with the engine&apos;s; the engine&apos;s CI re-records them
          live on every change. {v("conformance.sessions", "int")} sessions,{" "}
          {v("conformance.ops", "int")} operations,{" "}
          {v("conformance.checkpoints", "int")} checkpoints in the final
          histories.
        </p>
        <Scroll>
          <table className="text-xs" data-testid="conformance-table">
            <thead>
              <tr className="text-left text-neutral-600 dark:text-neutral-400">
                <th className={TH}>session</th>
                <th className={TH}>graph</th>
                <th className={TH}>operations</th>
                <th className={TH}>outcomes</th>
                <th className={TH}>checkpoints</th>
              </tr>
            </thead>
            <tbody>
              {(rec.sessions as Obj[]).map((s) => (
                <tr key={s.name}>
                  <td className={TD}>{s.name}</td>
                  <td className={TD}>{s.graph}</td>
                  <td className={TD}>
                    {(s.ops as Obj[]).map((o) => opText(o.op)).join("; ")}
                  </td>
                  <td className={TD}>
                    {(s.ops as Obj[])
                      .map(
                        (o) =>
                          o.outcome.status +
                          (o.outcome.error ? ` (${o.outcome.error})` : ""),
                      )
                      .join("; ")}
                  </td>
                  <td className={TD}>
                    {
                      (
                        (s.ops as Obj[])[(s.ops as Obj[]).length - 1]!
                          .history as Obj[]
                      ).length
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>

        <h2>Super-steps of chapter 1&apos;s graphs</h2>
        <p>
          Illustrative node durations and a {v("consts.ckpt_ms", "ms")}{" "}
          checkpoint write; the super-steps are LangGraph&apos;s (the
          bulk-synchronous model of{" "}
          <a href={PREGEL_DOI} className={A}>
            Pregel
          </a>
          , SIGMOD 2010).
        </p>
        <Scroll>
          <table className="text-xs">
            <thead>
              <tr className="text-left text-neutral-600 dark:text-neutral-400">
                <th className={TH}>graph</th>
                <th className={TH}>super-steps</th>
                <th className={TH}>graph time</th>
                <th className={TH}>one node at a time</th>
                <th className={TH}>speed-up</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(graphs).map(([n, s]) => {
                const ss = (s as Obj).supersteps as Obj;
                return (
                  <tr key={n}>
                    <td className={TD}>{n}</td>
                    <td className={TD}>{ss.steps}</td>
                    <td className={TD}>{fmtMs(ss.graph_ms)}</td>
                    <td className={TD}>{fmtMs(ss.sequential_ms)}</td>
                    <td className={TD}>
                      {(
                        (ss.sequential_ms as number) / (ss.graph_ms as number)
                      ).toFixed(2)}
                      ×
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Scroll>

        <h2>Durable execution runs (chapter 4)</h2>
        <p>
          Every combination the widget offers: fault, idempotency key, and how
          the shipping choice is made. The history&apos;s shape follows
          durable-execution engines such as{" "}
          <a href={TEMPORAL_WORKFLOWS} className={A}>
            Temporal
          </a>
          , simplified; every time is illustrative.
        </p>
        <Scroll>
          <table className="text-xs" data-testid="durable-table">
            <thead>
              <tr className="text-left text-neutral-600 dark:text-neutral-400">
                <th className={TH}>fault | key | choice</th>
                <th className={TH}>outcome</th>
                <th className={TH}>charges</th>
                <th className={TH}>£ charged</th>
                <th className={TH}>events</th>
                <th className={TH}>finished at</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(runs).map(([k, r]) => (
                <tr key={k}>
                  <td className={TD}>{k.replace(/\|/g, " | ")}</td>
                  <td className={TD}>{(r as Obj).status}</td>
                  <td className={TD}>{(r as Obj).charges}</td>
                  <td className={TD}>{(r as Obj).charged}</td>
                  <td className={TD}>{(r as Obj).events}</td>
                  <td className={TD}>{fmtMs((r as Obj).t_end)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>

        <h2>Lost replies and retries: simulation against closed form</h2>
        <p>
          Each charge attempt&apos;s reply lost with probability q, at most A
          attempts, every attempt reaching the service. Seeded (mulberry32), the
          same in Python and in the browser.
        </p>
        <Scroll>
          <table className="text-xs" data-testid="sweep-table">
            <thead>
              <tr className="text-left text-neutral-600 dark:text-neutral-400">
                <th className={TH}>q</th>
                <th className={TH}>A</th>
                <th className={TH}>mean charges, no key</th>
                <th className={TH}>(1 − q^A)/(1 − q)</th>
                <th className={TH}>P(two or more)</th>
                <th className={TH}>q</th>
                <th className={TH}>P(all lost)</th>
                <th className={TH}>q^A</th>
                <th className={TH}>with a key</th>
              </tr>
            </thead>
            <tbody>
              {sweeps.map((s) => (
                <tr key={`${s.q}-${s.attempts}`}>
                  <td className={TD}>{s.q}</td>
                  <td className={TD}>{s.attempts}</td>
                  <td className={TD}>{(s.mean_no_key as number).toFixed(4)}</td>
                  <td className={TD}>
                    {(s.expected_no_key as number).toFixed(4)}
                  </td>
                  <td className={TD}>{(s.dup_rate as number).toFixed(4)}</td>
                  <td className={TD}>
                    {(s.expected_dup as number).toFixed(4)}
                  </td>
                  <td className={TD}>
                    {((s.failed as number) / (s.runs as number)).toFixed(4)}
                  </td>
                  <td className={TD}>
                    {(s.expected_failed as number).toFixed(4)}
                  </td>
                  <td className={TD}>{(s.mean_key as number).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
        <p>
          {sweeps.length} settings of {v("durable.sweeps.0.runs", "int")} orders
          each, seed {v("durable.sweeps.0.seed", "int")}.
        </p>

        <h2>Multi-agent patterns (chapter 5)</h2>
        <p>
          Uncontended (no queueing), Claude Sonnet 4.6 list prices, the hosted
          latency profile; accuracy falls 0.01 per 1,000 prompt tokens past
          4,000 (illustrative). Sub-questions × tool-result tokens.
        </p>
        <Scroll>
          <table className="text-xs" data-testid="patterns-table">
            <thead>
              <tr className="text-left text-neutral-600 dark:text-neutral-400">
                <th className={TH}>task</th>
                <th className={TH}>pattern</th>
                <th className={TH}>model calls</th>
                <th className={TH}>input tokens</th>
                <th className={TH}>cached</th>
                <th className={TH}>cost</th>
                <th className={TH}>latency</th>
                <th className={TH}>P(success)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(pat)
                .filter(([k]) => k.endsWith("|10"))
                .flatMap(([k, rows]) =>
                  Object.values(rows as Obj).map((r) => (
                    <tr key={`${k}-${(r as Obj).pattern}`}>
                      <td className={TD}>
                        {k.split("|").slice(0, 2).join(" × ")}
                      </td>
                      <td className={TD}>{(r as Obj).pattern}</td>
                      <td className={TD}>{(r as Obj).model_calls}</td>
                      <td className={TD}>{fmtInt((r as Obj).input)}</td>
                      <td className={TD}>{fmtInt((r as Obj).cached)}</td>
                      <td className={TD}>{fmtUsd((r as Obj).cost)}</td>
                      <td className={TD}>{fmtMs((r as Obj).latency_ms)}</td>
                      <td className={TD}>{pct((r as Obj).success, 1)}</td>
                    </tr>
                  )),
                )}
            </tbody>
          </table>
        </Scroll>

        <h2>Fan-out under a rate limit (chapter 6)</h2>
        <p>
          A map-reduce over {fans[0]!.chunks} chunks of {fans[0]!.chunk_tokens}{" "}
          tokens, {fans[0]!.rpm} requests and {fmtInt(fans[0]!.otpm)} output
          tokens a minute, simulated with no failures.
        </p>
        <Scroll>
          <table className="text-xs" data-testid="fanout-table">
            <thead>
              <tr className="text-left text-neutral-600 dark:text-neutral-400">
                <th className={TH}>input tokens / min</th>
                <th className={TH}>width</th>
                <th className={TH}>run time</th>
                <th className={TH}>speed-up</th>
                <th className={TH}>Amdahl</th>
                <th className={TH}>bucket bound</th>
              </tr>
            </thead>
            <tbody>
              {fans.flatMap((f) =>
                (f.rows as Obj[]).map((r) => (
                  <tr key={`${f.itpm}-${r.width}`}>
                    <td className={TD}>{fmtInt(f.itpm)}</td>
                    <td className={TD}>{r.width}</td>
                    <td className={TD}>{fmtMs(r.ms)}</td>
                    <td className={TD}>{(r.speedup as number).toFixed(2)}×</td>
                    <td className={TD}>{(r.amdahl as number).toFixed(2)}×</td>
                    <td className={TD}>{(r.ceiling as number).toFixed(2)}×</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </Scroll>

        <h2>Reliability: closed form against simulation (chapter 7)</h2>
        <p>
          Visible errors {v("reliability.rel.e", "num")}, silent errors{" "}
          {v("reliability.rel.w", "num")} per attempt;{" "}
          {v("reliability.rel.runs", "int")} seeded runs a point; 95% Wilson
          intervals.
        </p>
        <Scroll>
          <table className="text-xs" data-testid="reliability-table">
            <thead>
              <tr className="text-left text-neutral-600 dark:text-neutral-400">
                <th className={TH}>each step gets</th>
                <th className={TH}>steps</th>
                <th className={TH}>closed form</th>
                <th className={TH}>simulated</th>
                <th className={TH}>95% interval</th>
                <th className={TH}>attempts</th>
                <th className={TH}>closed form</th>
              </tr>
            </thead>
            <tbody>
              {rel.flatMap((st) =>
                (st.curve as Obj[]).map((c) => (
                  <tr key={`${st.name}-${c.n}`}>
                    <td className={TD}>{st.label}</td>
                    <td className={TD}>{c.n}</td>
                    <td className={TD}>{(c.closed as number).toFixed(4)}</td>
                    <td className={TD}>{(c.rate as number).toFixed(4)}</td>
                    <td className={TD}>
                      {(c.ci[0] as number).toFixed(3)}–
                      {(c.ci[1] as number).toFixed(3)}
                    </td>
                    <td className={TD}>{(c.attempts as number).toFixed(2)}</td>
                    <td className={TD}>
                      {(c.closed_attempts as number).toFixed(2)}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </Scroll>

        <h2>Many workflows at once (chapter 8)</h2>
        <p>
          {v("scale.workflows", "int")} workflows per row, Poisson arrivals,
          seed {v("scale.seed", "int")}; {v("scale.defaults.rpm", "int")}{" "}
          requests, {v("scale.defaults.itpm", "int")} input and{" "}
          {v("scale.defaults.otpm", "int")} output tokens a minute, concurrency{" "}
          {v("scale.defaults.concurrency", "int")}, transient failures{" "}
          {v("scale.defaults.fail", "pct")} per attempt, up to{" "}
          {v("scale.defaults.max_attempts", "int")} attempts.
        </p>
        <Scroll>
          <table className="text-xs" data-testid="load-table">
            <thead>
              <tr className="text-left text-neutral-600 dark:text-neutral-400">
                <th className={TH}>pattern</th>
                <th className={TH}>capacity / min</th>
                <th className={TH}>arrivals / min</th>
                <th className={TH}>success</th>
                <th className={TH}>p50</th>
                <th className={TH}>p95</th>
                <th className={TH}>p99</th>
                <th className={TH}>$ per success</th>
                <th className={TH}>completed / min</th>
              </tr>
            </thead>
            <tbody>
              {load.flatMap((x) =>
                (x.rows as Obj[]).map((r, i) => (
                  <tr key={`${x.pattern}-${i}`}>
                    <td className={TD}>{x.pattern}</td>
                    <td className={TD}>
                      {(x.capacity.min as number).toFixed(2)}
                    </td>
                    <td className={TD}>{rates[i]}</td>
                    <td className={TD}>{pct(r.success, 1)}</td>
                    <td className={TD}>{fmtMs(r.p50)}</td>
                    <td className={TD}>{fmtMs(r.p95)}</td>
                    <td className={TD}>{fmtMs(r.p99)}</td>
                    <td className={TD}>{fmtUsd(r.cost_per_success)}</td>
                    <td className={TD}>
                      {(r.throughput_per_min as number).toFixed(2)}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </Scroll>

        <h2>The chooser&apos;s tables (chapter 9)</h2>
        <p>
          {v("choose.workflows", "int")} simulated workflows per row,
          1,500-token tool results; arrivals {v("choose.rates.0", "num")} a
          minute for 4 sub-questions and {v("choose.rates.1", "num")} for 16.
          The closed form is chapter 5&apos;s success times the chance every
          call gets through its retries.
        </p>
        <Scroll>
          <table className="text-xs" data-testid="choose-table-data">
            <thead>
              <tr className="text-left text-neutral-600 dark:text-neutral-400">
                <th className={TH}>sub-questions</th>
                <th className={TH}>pattern</th>
                <th className={TH}>success (95% interval)</th>
                <th className={TH}>closed form</th>
                <th className={TH}>p95</th>
                <th className={TH}>$ per success</th>
                <th className={TH}>capacity / min</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(tables).flatMap(([k, rows]) =>
                (rows as Obj[]).map((r) => (
                  <tr key={`${k}-${r.pattern}`}>
                    <td className={TD}>{k}</td>
                    <td className={TD}>{r.pattern}</td>
                    <td className={TD}>
                      {pct(r.success, 1)} ({pct(r.ci[0], 1)}–{pct(r.ci[1], 1)})
                    </td>
                    <td className={TD}>{pct(r.closed_success, 1)}</td>
                    <td className={TD}>{fmtMs(r.p95)}</td>
                    <td className={TD}>{fmtUsd(r.cost_per_success)}</td>
                    <td className={TD}>{(r.capacity as number).toFixed(2)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </Scroll>
      </div>
    </main>
  );
}
