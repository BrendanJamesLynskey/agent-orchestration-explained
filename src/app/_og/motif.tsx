/**
 * This site's favicon glyph (src/app/icon.svg) and its card's graphic.
 * Glyph: the bubble of the Agents track, the letter O, #9333ea.
 */
import { STATE_COLOUR } from "@/lib/viz/palette";

export function Glyph({ size }: { size: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect x="0.5" y="1" width="31" height="24" rx="6" fill="#9333ea" />
      <path d="M6 23v8.5l8.5-8.5z" fill="#9333ea" />
      <path
        d="M22.67 12.99Q22.67 15.17 21.95 16.78Q21.24 18.4 19.76 19.3Q18.29 20.21 16 20.21Q13.73 20.21 12.25 19.3Q10.76 18.4 10.05 16.77Q9.33 15.15 9.33 12.97Q9.33 10.79 10.05 9.19Q10.76 7.58 12.25 6.69Q13.73 5.79 16.02 5.79Q18.29 5.79 19.76 6.69Q21.24 7.58 21.95 9.2Q22.67 10.81 22.67 12.99ZM12.45 12.99Q12.45 15.19 13.29 16.45Q14.14 17.72 16 17.72Q17.9 17.72 18.73 16.45Q19.55 15.19 19.55 12.99Q19.55 10.77 18.73 9.52Q17.9 8.26 16.02 8.26Q14.14 8.26 13.29 9.52Q12.45 10.77 12.45 12.99Z"
        fill="#fff"
      />
    </svg>
  );
}

/**
 * A graph like chapter 1's: one node fans out to three parallel branches (one super-step), which
 * join before the end; drawn in the site's state colours. Schematic.
 */
export function Motif(): JSX.Element {
  const N: [number, number, string][] = [
    [220, 40, STATE_COLOUR.ok],
    [220, 130, STATE_COLOUR.active],
    [90, 230, STATE_COLOUR.active],
    [220, 230, STATE_COLOUR.paused],
    [350, 230, STATE_COLOUR.active],
    [220, 330, STATE_COLOUR.active],
    [220, 400, STATE_COLOUR.ok],
  ];
  const E: [number, number][] = [
    [0, 1],
    [1, 2],
    [1, 3],
    [1, 4],
    [2, 5],
    [3, 5],
    [4, 5],
    [5, 6],
  ];
  return (
    <svg width="440" height="420" viewBox="0 0 440 420">
      {E.map(([a, b]) => {
        const [x1, y1] = N[a]!;
        const [x2, y2] = N[b]!;
        return (
          <line
            key={`${a}-${b}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#94a3b8"
            strokeWidth={4}
          />
        );
      })}
      {N.map(([x, y, c], i) =>
        i === 0 || i === N.length - 1 ? (
          <circle key={i} cx={x} cy={y} r={16} fill={c} />
        ) : (
          <rect
            key={i}
            x={x - 50}
            y={y - 26}
            width={100}
            height={52}
            rx={12}
            fill="#0b1020"
            stroke={c}
            strokeWidth={6}
          />
        ),
      )}
    </svg>
  );
}
