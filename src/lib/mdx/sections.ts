/**
 * Chapter catalogue + filesystem loader for /learn content.
 *
 * MDX sources live under `/content/chapters/`, one per mechanism, each built
 * around an animation. Their slugs and order are defined here (single source
 * of truth); the `[slug]` route validates incoming params against this list
 * before reading from disk. Same shape as the companion sites'
 * `src/lib/mdx/sections.ts`.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const SECTIONS = [
  {
    slug: "01-from-a-chain-to-a-graph",
    title: "From a chain to a graph",
    summary:
      "A request flowing through a graph, super-step by super-step: nodes light up together, writes wait at a barrier, state flows along the edges, and a step lasts as long as its slowest node.",
  },
  {
    slug: "02-state-channels-and-reducers",
    title: "State, channels and reducers",
    summary:
      "Two parallel branches write the same key: no reducer is an error, an add reducer keeps both in a fixed order, a custom reducer picks one; and what a router can see.",
  },
  {
    slug: "03-checkpoints-and-interrupts",
    title: "Checkpoints and interrupts",
    summary:
      "A checkpoint after every super-step: a run that crashes and resumes, a human interrupt, an edit, and time travel that forks the thread, on a timeline of checkpoints.",
  },
  {
    slug: "04-durable-execution",
    title: "Durable execution",
    summary:
      "An event history replayed after a crash: recorded steps are not run again, a step that reads the clock breaks the replay, and an idempotency key stops a double charge.",
  },
  {
    slug: "05-multi-agent-patterns",
    title: "Multi-agent patterns",
    summary:
      "Single agent, supervisor, hierarchical, swarm, debate and map-reduce on the same task: every call on a timeline, each agent's context, and what each pattern costs in tokens, time and reliability.",
  },
  {
    slug: "06-fan-out-and-map-reduce",
    title: "Fan-out and map-reduce",
    summary:
      "Parallel workers under a rate limit: watch calls queue for token capacity and the speed-up saturate, against Amdahl's law and the bound the token bucket sets.",
  },
  {
    slug: "07-reliability",
    title: "Reliability",
    summary:
      "Success decays with every step; retries fix visible errors, a verifier catches silent ones. The closed forms beside seeded simulations and their confidence intervals.",
  },
  {
    slug: "08-running-at-scale",
    title: "Running at scale",
    summary:
      "Hundreds of workflows sharing one rate-limited endpoint: queueing, tail latency, retries and cost per successful task, and the knee where load meets capacity.",
  },
  {
    slug: "09-choosing-a-pattern",
    title: "Choosing a pattern",
    summary:
      "A decision guide built from the simulation: set constraints on success, latency, cost and throughput, and watch them strike out patterns until one is left.",
  },
] as const;

export type SectionSlug = (typeof SECTIONS)[number]["slug"];

const SLUG_SET = new Set<string>(SECTIONS.map((s) => s.slug));

export function isValidSlug(slug: string): slug is SectionSlug {
  return SLUG_SET.has(slug);
}

export function getSectionMeta(slug: SectionSlug): (typeof SECTIONS)[number] {
  return SECTIONS.find((s) => s.slug === slug) ?? SECTIONS[0];
}

/** Read the raw MDX source for a chapter, or `null` if it doesn't exist. */
export async function readSectionMdx(
  slug: SectionSlug,
): Promise<string | null> {
  const path = join(process.cwd(), "content", "chapters", `${slug}.mdx`);
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}
