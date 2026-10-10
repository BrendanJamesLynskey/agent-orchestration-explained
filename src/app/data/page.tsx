/**
 * /data: the LangGraph conformance sessions (what was compared, with which version), and every
 * result the chapters quote, computed by the engine at build time. Server Component.
 */
import RECORDING from "@/data/langgraph_recordings.json";
import type { Obj } from "@/lib/engine";
import VENDORED from "@/lib/engine/vendor/VENDORED.json";
import { fmtMs } from "@/lib/format";
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
    "The LangGraph conformance sessions (langgraph 1.2.14, every checkpoint compared), the super-step timings of the teaching graphs, every durable-execution run and the seeded sweeps against their closed forms.",
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
          the engine&apos;s own recorded run is{" "}
          <a
            href={engineFile("fixtures/orchestration_results.md")}
            className={A}
          >
            orchestration_results.md
          </a>
          .
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
      </div>
    </main>
  );
}
