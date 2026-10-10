/** The pages and animations every e2e spec walks. */
export const PAGES = [
  "/",
  "/learn",
  "/data",
  "/about",
  "/learn/01-from-a-chain-to-a-graph",
  "/learn/02-state-channels-and-reducers",
  "/learn/03-checkpoints-and-interrupts",
  "/learn/04-durable-execution",
  "/learn/05-multi-agent-patterns",
  "/learn/06-fan-out-and-map-reduce",
  "/learn/07-reliability",
  "/learn/08-running-at-scale",
  "/learn/09-choosing-a-pattern",
] as const;

export const ANIMATIONS = [
  ["/learn/01-from-a-chain-to-a-graph", "graph-widget"],
  ["/learn/02-state-channels-and-reducers", "reducer-widget"],
  ["/learn/03-checkpoints-and-interrupts", "checkpoint-widget"],
  ["/learn/04-durable-execution", "durable-widget"],
  ["/learn/05-multi-agent-patterns", "patterns-widget"],
  ["/learn/06-fan-out-and-map-reduce", "fanout-widget"],
  ["/learn/07-reliability", "reliability-widget"],
  ["/learn/08-running-at-scale", "scale-widget"],
  ["/learn/09-choosing-a-pattern", "chooser-widget"],
] as const;

/** The engine runs in the page after it loads: allow for a slow runner. */
export const ENGINE_TIMEOUT = 45_000;
