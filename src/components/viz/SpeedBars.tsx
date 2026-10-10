/**
 * The landing page's picture: for each teaching graph of chapter 1, the time its super-steps take
 * against running one node at a time, computed by the engine at build time. Server Component.
 */
import type { Obj } from "@/lib/engine";
import { fmtMs } from "@/lib/format";
import { tree } from "@/lib/orch/values";
import { MUTED, STATE_COLOUR } from "@/lib/viz/palette";

const LABEL: Record<string, string> = {
  chain: "chain",
  fanout: "fan-out",
  react_loop: "agent loop",
  loop_join: "loop + join",
};

export function SpeedBars(): JSX.Element {
  const sessions = tree().graph.sessions as Obj;
  const names = Object.keys(sessions);
  const max = Math.max(
    ...names.map((n) => sessions[n].supersteps.sequential_ms as number),
  );
  const W = 320;
  const X0 = 78;
  const BW = W - X0 - 8;
  const row = 34;
  const H = names.length * row + 26;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Graph time against one node at a time, for the four graphs of chapter 1."
    >
      {names.map((n, i) => {
        const ss = sessions[n].supersteps as Obj;
        const y = 8 + i * row;
        return (
          <g key={n}>
            <text
              x={0}
              y={y + 12}
              style={{ fontSize: 11 }}
              className="fill-neutral-700 dark:fill-neutral-300"
            >
              {LABEL[n] ?? n}
            </text>
            <rect
              x={X0}
              y={y}
              width={(BW * ss.graph_ms) / max}
              height={11}
              fill={STATE_COLOUR.active}
            />
            <rect
              x={X0}
              y={y + 13}
              width={(BW * ss.sequential_ms) / max}
              height={7}
              fill={MUTED.light}
            />
            <text
              x={X0 + (BW * ss.graph_ms) / max + 4}
              y={y + 10}
              style={{ fontSize: 10 }}
              className="fill-neutral-700 dark:fill-neutral-300"
            >
              {fmtMs(ss.graph_ms)}
            </text>
          </g>
        );
      })}
      <g transform={`translate(0,${H - 8})`}>
        <rect x={0} y={-8} width={10} height={8} fill={STATE_COLOUR.active} />
        <text
          x={14}
          y={0}
          style={{ fontSize: 10 }}
          className="fill-neutral-700 dark:fill-neutral-300"
        >
          super-steps
        </text>
        <rect x={100} y={-8} width={10} height={8} fill={MUTED.light} />
        <text
          x={114}
          y={0}
          style={{ fontSize: 10 }}
          className="fill-neutral-700 dark:fill-neutral-300"
        >
          one node at a time
        </text>
      </g>
    </svg>
  );
}
