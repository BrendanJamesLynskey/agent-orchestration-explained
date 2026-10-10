/**
 * The family's visual language (explained_sites_visual_standard.md §3): Okabe and Ito's
 * colour-blind-safe palette, the same in light and dark mode. On the Orchestration site:
 *
 * - a node is idle (outlined), running (the "active" blue), done (muted) or failed / waiting
 *   (the warning hue plus a hatch, never colour alone); an interrupted node is purple with a pause
 *   mark;
 * - one colour per checkpoint source (input, loop, update, fork) and per durable-history event;
 * - one colour per branch of a fan-out, so a write can be followed from its node to the reducer.
 *
 * Okabe, M. and Ito, K. (2008), "Color Universal Design (CUD): how to make figures and
 * presentations that are friendly to colorblind people", https://jfly.uni-koeln.de/color/
 */

export const OKABE_ITO = {
  black: "#000000",
  orange: "#E69F00",
  sky: "#56B4E9",
  green: "#009E73",
  yellow: "#F0E442",
  blue: "#0072B2",
  vermillion: "#D55E00",
  purple: "#CC79A7",
} as const;

export const STATE_COLOUR = {
  active: OKABE_ITO.blue,
  stalled: OKABE_ITO.vermillion,
  ok: OKABE_ITO.green,
  paused: OKABE_ITO.purple,
} as const;

/** Muted ("done", "idle") greys: Tailwind neutral-400 and neutral-600. */
export const MUTED = { light: "#a3a3a3", dark: "#525252" } as const;

/** One colour per checkpoint source. */
export const SOURCE_COLOUR: Record<string, string> = {
  input: OKABE_ITO.sky,
  loop: OKABE_ITO.blue,
  update: OKABE_ITO.orange,
  fork: OKABE_ITO.purple,
};

/** One colour per kind of durable-history event. */
export const EVENT_COLOUR: Record<string, string> = {
  workflow_started: OKABE_ITO.sky,
  activity_scheduled: OKABE_ITO.blue,
  activity_completed: OKABE_ITO.green,
  activity_timed_out: OKABE_ITO.vermillion,
  activity_failed: OKABE_ITO.vermillion,
  marker: OKABE_ITO.orange,
  workflow_completed: OKABE_ITO.green,
};

/** Branch colours: a node's writes keep its colour from the node to the reducer. */
export const BRANCH_COLOUR = [
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.purple,
  OKABE_ITO.sky,
  OKABE_ITO.yellow,
];

/** A stable colour per node name within a graph (declaration order). */
export function nodeColour(order: string[], name: string): string {
  const i = order.indexOf(name);
  return i < 0 ? OKABE_ITO.sky : BRANCH_COLOUR[i % BRANCH_COLOUR.length]!;
}
