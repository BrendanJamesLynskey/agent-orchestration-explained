import Link from "next/link";

import { SpeedBars } from "@/components/viz/SpeedBars";
import { SECTIONS } from "@/lib/mdx/sections";
import { formatValue, lookup } from "@/lib/orch/values";
import {
  ARCHITECTURES_URL,
  CONTEXT_URL,
  DECODER_URL,
  ENGINE_URL,
  HARNESSES_URL,
  INFERENCE_URL,
  KERNELS_URL,
  LANGGRAPH_REPO,
  NUMERICS_URL,
  PROTOCOLS_URL,
  SILICON_URL,
  TRADEOFFS_URL,
} from "@/lib/site";

const LINK =
  "focus-ring rounded underline decoration-accent/40 underline-offset-4 hover:decoration-accent";

/**
 * Landing page: what the site is, a picture of what super-steps buy (computed by the engine at
 * build time), and the ways in. Server Component with no client JavaScript of its own.
 */
export default function HomePage(): JSX.Element {
  const v = (path: string, fmt: Parameters<typeof formatValue>[1]) =>
    formatValue(lookup(path), fmt);
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 sm:py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-accent dark:text-indigo-300">
        Agent Orchestration Explained
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
        Agents as graphs, steps and checkpoints.
      </h1>
      <div className="mt-8 grid items-center gap-8 md:grid-cols-[1fr_minmax(0,22rem)]">
        <div>
          <p className="max-w-2xl text-lg text-neutral-600 dark:text-neutral-300">
            A multi-step agent is a <strong>discrete-event system</strong>:
            nodes run in steps, write to a shared state, wait at barriers, save
            checkpoints, pause for people, crash and resume. This site takes{" "}
            <a href={LANGGRAPH_REPO} className={LINK}>
              LangGraph
            </a>
            &apos;s execution model apart, super-step by super-step, and then
            durable execution: replaying a workflow&apos;s history after a crash
            without paying for its side effects twice. Then it scales up:
            multi-agent patterns compared on one task, fan-out against a rate
            limit, reliability with retries and verifiers, hundreds of workflows
            sharing one endpoint, and a pattern chosen from the simulation
            rather than from opinion.
          </p>
          <p className="mt-4 max-w-2xl text-neutral-600 dark:text-neutral-300">
            The animations are driven by{" "}
            <a href={ENGINE_URL} className={LINK}>
              Agent_Loop_Sim
            </a>
            &apos;s orchestration module, identically in Python and in your
            browser. Its graph runtime is checked against real LangGraph{" "}
            {v("conformance.langgraph", "raw")} in CI:{" "}
            {v("conformance.sessions", "int")} sessions,{" "}
            {v("conformance.ops", "int")} operations (runs, crashes, resumes,
            interrupts, edits, time travel, <code>Send</code> fan-outs) and{" "}
            {v("conformance.checkpoints", "int")} checkpoints, every one equal.
            No language model runs anywhere.
          </p>
        </div>
        <figure className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <SpeedBars />
          <figcaption className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
            Chapter 1&apos;s graphs: a super-step lasts as long as its slowest
            node, so parallel branches save time and a loop saves none
            (illustrative node times). Computed by the engine at build time.
          </figcaption>
        </figure>
      </div>
      <nav aria-label="Chapters" className="mt-12 grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s, i) => (
          <Link
            key={s.slug}
            href={`/learn/${s.slug}`}
            className="focus-ring group rounded-lg border border-neutral-200 p-5 hover:border-accent dark:border-neutral-800 dark:hover:border-indigo-400"
          >
            <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
              {String(i + 1).padStart(2, "0")}
            </p>
            <h2 className="mt-1 font-semibold">{s.title}</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {s.summary}
            </p>
          </Link>
        ))}
      </nav>
      <p className="mt-12 text-sm text-neutral-600 dark:text-neutral-400">
        The fourth of a family of agent sites, after{" "}
        <a href={HARNESSES_URL} className={LINK}>
          Agent Harnesses Explained
        </a>
        ,{" "}
        <a href={PROTOCOLS_URL} className={LINK}>
          Agent Protocols Explained
        </a>{" "}
        and{" "}
        <a href={CONTEXT_URL} className={LINK}>
          Agent Context Explained
        </a>
        , alongside the LLM-systems sites: the{" "}
        <a href={DECODER_URL} className={LINK}>
          Transformer Decoder Explainer
        </a>
        ,{" "}
        <a href={INFERENCE_URL} className={LINK}>
          LLM Inference Explained
        </a>
        ,{" "}
        <a href={ARCHITECTURES_URL} className={LINK}>
          LLM Architectures Explained
        </a>
        ,{" "}
        <a href={KERNELS_URL} className={LINK}>
          GPU Kernels Explained
        </a>
        ,{" "}
        <a href={NUMERICS_URL} className={LINK}>
          Numerics Explained
        </a>
        ,{" "}
        <a href={SILICON_URL} className={LINK}>
          Systolic Arrays Explained
        </a>{" "}
        and{" "}
        <a href={TRADEOFFS_URL} className={LINK}>
          Inference Trade-offs Explained
        </a>
        . How this one was built, and how to check it:{" "}
        <Link href="/about" className={LINK}>
          about
        </Link>
        .
      </p>
    </main>
  );
}
