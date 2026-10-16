/**
 * The Agents track's reading order (brief 43): the six sites in the order they build on each
 * other, with what each one adds and what it assumes. The same file on all six landing pages;
 * `current` marks this site. Server Component.
 */
const LINK =
  "focus-ring rounded underline decoration-accent/40 underline-offset-4 hover:decoration-accent";

export const AGENT_TRACK = [
  {
    key: "harnesses",
    name: "Harnesses",
    url: "https://agent-harnesses-explained.vercel.app",
    why: "the loop, tools, context budget, prompt cache and permissions around one model; assumes nothing",
  },
  {
    key: "protocols",
    name: "Protocols",
    url: "https://agent-protocols-explained.vercel.app",
    why: "how tools and other agents are reached on the wire (MCP, A2A); assumes the loop",
  },
  {
    key: "context",
    name: "Context",
    url: "https://agent-context-explained.vercel.app",
    why: "what goes into the window: retrieval, packing, compaction, memory; assumes the context budget",
  },
  {
    key: "orchestration",
    name: "Orchestration",
    url: "https://agent-orchestration-explained.vercel.app",
    why: "many steps and many agents as a graph: state, checkpoints, durable runs, fan-out",
  },
  {
    key: "evals",
    name: "Evals",
    url: "https://agent-evals-explained.vercel.app",
    why: "is the agent good, and how sure are you: pass@k, intervals, graders, the harness effect",
  },
  {
    key: "security",
    name: "Security",
    url: "https://agent-security-explained.vercel.app",
    why: "defences by design: trust labels, least privilege, sandboxes, approvals; reads best last",
  },
] as const;

export type AgentSite = (typeof AGENT_TRACK)[number]["key"];

export function ReadingOrder({ current }: { current: AgentSite }): JSX.Element {
  return (
    <section
      aria-labelledby="reading-order-heading"
      data-testid="reading-order"
      className="mt-12 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800"
    >
      <h2
        id="reading-order-heading"
        className="text-xl font-semibold tracking-tight"
      >
        Reading order for the Agents track
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-300">
        Six sites, one engine. Each builds on the ones before it, but each also
        stands alone: start anywhere and follow the links back.
      </p>
      <ol className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {AGENT_TRACK.map((s, i) => (
          <li key={s.key} className="flex min-w-0 gap-2">
            <span className="font-mono text-xs leading-5 text-neutral-500 dark:text-neutral-400">
              {i + 1}
            </span>
            <span className="min-w-0">
              {s.key === current ? (
                <strong aria-current="page">{s.name} (this site)</strong>
              ) : (
                <a href={s.url} className={LINK}>
                  {s.name}
                </a>
              )}
              <span className="text-neutral-600 dark:text-neutral-400">
                : {s.why}.
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
