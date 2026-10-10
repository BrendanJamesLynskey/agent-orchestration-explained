/**
 * /about: what the site is, what the engine computes and what it leaves out, how the animations are
 * driven and checked, and how the runtime is checked against LangGraph. Server Component, static.
 */
import Link from "next/link";

import VENDORED from "@/lib/engine/vendor/VENDORED.json";
import DATA from "@/lib/engine/vendor/orchestration_data.json";
import { formatValue, lookup } from "@/lib/orch/values";
import {
  CONTEXT_URL,
  DECODER_URL,
  ENGINE_URL,
  GITHUB_URL,
  HARNESSES_URL,
  INFERENCE_URL,
  INTRO_LANGGRAPH,
  LANGGRAPH_REPO,
  PROTOCOLS_URL,
  TEMPORAL_WORKFLOWS,
  TRADEOFFS_URL,
  repoFile,
} from "@/lib/site";

export const metadata = {
  title: "About",
  description:
    "What Agent Orchestration Explained's engine computes, how its graph runtime is checked against real LangGraph, what is illustrative, and how Python and the browser are checked to agree exactly.",
};

const A =
  "focus-ring rounded text-accent underline underline-offset-2 dark:text-indigo-300";

export default function AboutPage(): JSX.Element {
  const v = (path: string, fmt: Parameters<typeof formatValue>[1]) =>
    formatValue(lookup(path), fmt);
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-accent dark:text-indigo-300">
        /about
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        About this site
      </h1>
      <div className="mdx-content mt-6">
        <p>
          Agent Orchestration Explained treats multi-step and multi-agent
          systems as discrete-event systems. Its first four chapters take apart
          LangGraph&apos;s execution model (graphs and super-steps, state with
          reducers, checkpoints, interrupts and time travel) and durable
          execution (replay, non-determinism, idempotency keys). Every chapter
          is built around an animation. It is the fourth of a family of agent
          sites, after{" "}
          <a href={HARNESSES_URL} className={A}>
            Agent Harnesses Explained
          </a>
          ,{" "}
          <a href={PROTOCOLS_URL} className={A}>
            Agent Protocols Explained
          </a>{" "}
          and{" "}
          <a href={CONTEXT_URL} className={A}>
            Agent Context Explained
          </a>
          , next to the LLM-systems sites (the{" "}
          <a href={DECODER_URL} className={A}>
            Transformer Decoder Explainer
          </a>
          ,{" "}
          <a href={INFERENCE_URL} className={A}>
            LLM Inference Explained
          </a>
          ,{" "}
          <a href={TRADEOFFS_URL} className={A}>
            Inference Trade-offs Explained
          </a>{" "}
          and others, all in the header&apos;s switch).
        </p>

        <h2>Checked against real LangGraph</h2>
        <p>
          The engine&apos;s graph runtime is a model of{" "}
          <a href={LANGGRAPH_REPO} className={A}>
            LangGraph
          </a>
          &apos;s, not a reimplementation of its code: graphs are data, and each
          node&apos;s behaviour is a short list of deterministic operations. In
          the engine&apos;s CI, every one of {v("conformance.sessions", "int")}{" "}
          sessions is built as a real <code>StateGraph</code> (plain node
          functions, <code>operator.add</code> and a <code>max</code> reducer,
          LangGraph&apos;s own <code>interrupt</code>, an in-memory
          checkpointer) and run in langgraph {v("conformance.langgraph", "raw")}{" "}
          (langgraph-checkpoint {v("conformance.checkpoint", "raw")}, pinned).
          After each of the {v("conformance.ops", "int")} operations (invokes,
          crashes, resumes, <code>Command(resume=…)</code>,{" "}
          <code>update_state</code>, time travel) the whole checkpoint history
          is compared with the engine&apos;s: every checkpoint&apos;s step,
          source, parent, state, next tasks, and each task&apos;s result, error
          and interrupt. They are equal. The{" "}
          <Link href="/data" className={A}>
            data page
          </Link>{" "}
          lists the sessions.
        </p>
        <p>
          One LangGraph detail turned out not to be deterministic: whether a
          checkpoint&apos;s <code>next</code> lists a join target whose other
          inputs have not arrived (it did in about nine runs in ten here). That
          task never runs from that checkpoint, so the comparison leaves it out
          on both sides; everything else is compared as recorded.
        </p>

        <h2>The engine, and how the animations are checked</h2>
        <p>
          The engine is{" "}
          <a href={ENGINE_URL} className={A}>
            Agent_Loop_Sim
          </a>
          &apos;s orchestration module (engine {DATA.version}): a Python
          reference with a TypeScript port, vendored here at commit{" "}
          <code>{VENDORED.commit.slice(0, 7)}</code> with every file&apos;s
          SHA-256 recorded. It runs in your browser in a few milliseconds.
          Agreement between the two languages is exact, with no tolerance: every
          checkpoint, frame, caption, durable-execution run and seeded sweep.
        </p>
        <ul>
          <li>
            In CI, the Python reference installed from the vendored commit
            regenerates{" "}
            <a
              href={repoFile("tests/fixtures/site_fixtures.json")}
              className={A}
            >
              this site&apos;s fixtures
            </a>{" "}
            (everything each chapter animates), and the unit tests require the
            vendored TS engine to reproduce them exactly.
          </li>
          <li>
            Every number in the prose is computed by the engine when the page is
            built, never typed in.
          </li>
          <li>
            Every code block in a chapter is cut from the vendored engine or
            from the LangGraph builder the conformance check uses, and every
            equation compiles; end-to-end tests play, step, scrub and reset
            every animation in light and dark mode at desktop and phone widths,
            and check its captions at key steps against the Python
            reference&apos;s frames.
          </li>
        </ul>

        <h2>What is illustrative</h2>
        <ul>
          <li>
            Node durations and the {v("consts.ckpt_ms", "ms")} checkpoint write
            (chapter 1 and 2&apos;s timings). The order of writes, what each
            node sees, which nodes run in which step, and every checkpoint are
            LangGraph&apos;s.
          </li>
          <li>
            The graphs, their state and their side effects (an API call, a
            notification, an email, a <code>git push</code>) are invented.
          </li>
          <li>
            Chapter 4&apos;s workflow, payment service, shipping cut-off and
            times (a {v("consts.timeout_ms", "ms")} reply timeout, a{" "}
            {v("consts.restart_ms", "ms")} restart). Its event history is
            simplified, in the style of durable-execution engines such as{" "}
            <a href={TEMPORAL_WORKFLOWS} className={A}>
              Temporal
            </a>
            , not any engine&apos;s format. Its closed forms are exact under
            their stated assumptions, and checked against a seeded simulation.
          </li>
        </ul>

        <h2>Accessibility</h2>
        <p>
          Every animation has keyboard controls (Space plays or pauses, the
          arrow keys step), a live caption read out by screen readers, and
          starts paused when the reader prefers reduced motion. Colours come
          from Okabe and Ito&apos;s colour-blind-safe palette, and nothing is
          told by colour alone: a failed node is also hatched and crossed, a
          paused one marked, a changed value tagged.
        </p>

        <h2>Source</h2>
        <p>
          The site&apos;s source is on{" "}
          <a href={GITHUB_URL} className={A}>
            GitHub
          </a>{" "}
          (MIT). For the slides behind the chapters, see{" "}
          <a href={INTRO_LANGGRAPH} className={A}>
            Introduction to LangGraph
          </a>
          .
        </p>
      </div>
    </main>
  );
}
