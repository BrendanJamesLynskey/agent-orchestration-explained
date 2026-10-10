"use client";

/**
 * A graph drawn from the engine's layout (orchestration `layout`: columns by longest path from
 * START, rows by declaration order), with each node's state for the frame on show:
 *
 * - idle: outlined; running: filled in the "active" blue; done: muted;
 * - next (triggered for the coming super-step): blue outline, dashed;
 * - failed or waiting at a join: the warning hue plus a hatch (never colour alone);
 * - paused at an interrupt: purple with a pause mark.
 *
 * Plain edges are solid, conditional edges dashed, a join edge ends at a barrier bar; an edge
 * that fired in this frame is drawn in the active colour. A back edge (a loop) arcs over the top.
 */
import { Hatch } from "@/components/interactive/Hatch";
import type { Obj } from "@/lib/engine";
import { MUTED, STATE_COLOUR } from "@/lib/viz/palette";

import type { SvgFont } from "./useSvgFont";

export type NodeState =
  | "idle"
  | "active"
  | "done"
  | "next"
  | "failed"
  | "waiting"
  | "paused";

const START = "__start__";
const END = "__end__";

export function nodeXY(
  layout: Obj,
  name: string,
  W: number,
  H: number,
  pad = 34,
): [number, number] {
  const p = layout.nodes[name] as Obj;
  const cols = layout.cols as number;
  const x = pad + ((W - 2 * pad) * (p.col as number)) / Math.max(1, cols - 1);
  const gap = Math.min(44, (H - 30) / Math.max(1, p.rows as number));
  const y =
    H / 2 + 6 + ((p.row as number) - ((p.rows as number) - 1) / 2) * gap;
  return [x, y];
}

export function GraphView({
  layout,
  states,
  fired = [],
  W,
  H,
  font,
  idPrefix,
  label,
  badges = {},
}: {
  layout: Obj;
  states: Record<string, NodeState>;
  /** Edges that fired in this frame: "from>to". */
  fired?: string[];
  W: number;
  H: number;
  font: SvgFont;
  idPrefix: string;
  label: string;
  /** A short text under a node (its duration, a write). */
  badges?: Record<string, string>;
}): JSX.Element {
  const fs = font.fs;
  const names = Object.keys(layout.nodes as Obj);
  const nodeW = font.narrow ? 52 : 58;
  // a node is wide enough for its label at the label's on-screen size (+ a mark)
  const widthOf = (n: string) =>
    Math.min(76, Math.max(nodeW, (n.length + 2) * fs(9) * 0.6 + 8));
  const nodeH = 22;
  const xy = (n: string) => nodeXY(layout, n, W, H);
  const fill = (st: NodeState) =>
    st === "active"
      ? STATE_COLOUR.active
      : st === "paused"
        ? STATE_COLOUR.paused
        : st === "failed" || st === "waiting"
          ? `url(#${idPrefix}-hatch)`
          : st === "done"
            ? MUTED.light
            : "transparent";
  return (
    <svg
      ref={font.ref}
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={label}
    >
      <defs>
        <Hatch id={`${idPrefix}-hatch`} />
        <marker
          id={`${idPrefix}-arrow`}
          viewBox="0 0 8 8"
          refX={7}
          refY={4}
          markerWidth={6}
          markerHeight={6}
          orient="auto-start-reverse"
        >
          <path
            d="M0,0 L8,4 L0,8 z"
            className="fill-neutral-500 dark:fill-neutral-400"
          />
        </marker>
        <marker
          id={`${idPrefix}-arrow-on`}
          viewBox="0 0 8 8"
          refX={7}
          refY={4}
          markerWidth={6}
          markerHeight={6}
          orient="auto-start-reverse"
        >
          <path d="M0,0 L8,4 L0,8 z" fill={STATE_COLOUR.active} />
        </marker>
      </defs>
      {(layout.edges as Obj[]).map((e, i) => {
        const [x1, y1] = xy(e.from);
        const [x2, y2] = xy(e.to);
        const on = fired.includes(`${e.from}>${e.to}`);
        const r1 = e.from === START ? 9 : widthOf(e.from) / 2;
        const r2 = e.to === END ? 9 : widthOf(e.to) / 2;
        let d: string;
        if (e.back) {
          const top = Math.min(y1, y2) - nodeH / 2;
          const lift = 26 + (i % 2) * 6;
          d = `M${x1},${y1 - nodeH / 2} C${x1},${top - lift} ${x2},${top - lift} ${x2},${y2 - nodeH / 2}`;
        } else {
          const sx = x1 + r1;
          const ex = x2 - r2 - (e.kind === "join" ? 5 : 1);
          const mx = (sx + ex) / 2;
          d = `M${sx},${y1} C${mx},${y1} ${mx},${y2} ${ex},${y2}`;
        }
        return (
          <g
            key={`${e.from}-${e.to}-${i}`}
            data-edge={`${e.from}>${e.to}`}
            data-fired={on ? "true" : "false"}
          >
            <path
              d={d}
              fill="none"
              stroke={on ? STATE_COLOUR.active : "currentColor"}
              strokeWidth={on ? 2.2 : 1.1}
              strokeDasharray={e.kind === "conditional" ? "4 3" : undefined}
              markerEnd={`url(#${idPrefix}-arrow${on ? "-on" : ""})`}
              className={on ? "" : "text-neutral-400 dark:text-neutral-500"}
            />
            {e.kind === "join" && !e.back && (
              <line
                x1={x2 - r2 - 4}
                x2={x2 - r2 - 4}
                y1={y2 - 9}
                y2={y2 + 9}
                stroke={STATE_COLOUR.stalled}
                strokeWidth={2.5}
              />
            )}
          </g>
        );
      })}
      {names.map((n) => {
        const [x, y] = xy(n);
        if (n === START || n === END)
          return (
            <g key={n} data-node={n}>
              <circle
                cx={x}
                cy={y}
                r={8}
                className={
                  n === START
                    ? "fill-neutral-700 dark:fill-neutral-300"
                    : "fill-none stroke-neutral-700 dark:stroke-neutral-300"
                }
                strokeWidth={2}
              />
              <text
                x={x}
                y={y + 21}
                textAnchor="middle"
                style={{ fontSize: fs(8) }}
                className="fill-neutral-600 dark:fill-neutral-400"
              >
                {n === START ? "START" : "END"}
              </text>
            </g>
          );
        const st = states[n] ?? "idle";
        const solid = st === "active" || st === "paused";
        return (
          <g key={n} data-node={n} data-state={st}>
            <rect
              x={x - widthOf(n) / 2}
              y={y - nodeH / 2}
              width={widthOf(n)}
              height={nodeH}
              rx={5}
              fill={fill(st)}
              stroke={
                st === "failed" || st === "waiting"
                  ? STATE_COLOUR.stalled
                  : st === "next" || st === "active"
                    ? STATE_COLOUR.active
                    : st === "paused"
                      ? STATE_COLOUR.paused
                      : "currentColor"
              }
              strokeWidth={st === "idle" || st === "done" ? 1 : 2}
              strokeDasharray={st === "next" ? "4 2" : undefined}
              className={
                st === "idle" || st === "done" ? "text-neutral-500" : ""
              }
            />
            <text
              x={x}
              y={y + 3.5}
              textAnchor="middle"
              style={{ fontSize: fs(9) }}
              className={
                solid
                  ? "fill-white font-medium"
                  : "fill-neutral-900 dark:fill-neutral-100"
              }
            >
              {st === "paused" ? "❚❚ " : st === "failed" ? "✗ " : ""}
              {n}
            </text>
            {badges[n] && (
              <text
                x={x}
                y={y + nodeH / 2 + 11}
                textAnchor="middle"
                style={{ fontSize: fs(8) }}
                className="fill-neutral-600 dark:fill-neutral-400"
              >
                {badges[n]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
