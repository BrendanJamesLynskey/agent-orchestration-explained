/**
 * The Agents track's reading order (brief 43): the six sites in the order they build on each
 * other, with what each one adds and what it assumes. The same file on all six landing pages;
 * `current` marks this site. Since brief 44 it renders through the shared, byte-identical
 * `src/components/learn/ReadingOrder.tsx` (one component for every track's start page), with
 * this track's data. Server Component.
 */
import { ReadingOrder as TrackOrder } from "@/components/learn/ReadingOrder";

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

/** The Agents track's start page, on the track's first site. */
export const AGENTS_START =
  "https://agent-harnesses-explained.vercel.app/agents";

export function ReadingOrder({ current }: { current: AgentSite }): JSX.Element {
  return (
    <TrackOrder
      track="Agents"
      intro="Six sites, one engine. Each builds on the ones before it, but each also stands alone: start anywhere and follow the links back."
      sites={AGENT_TRACK}
      current={current}
    />
  );
}
