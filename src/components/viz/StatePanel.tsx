"use client";

/**
 * The graph's state at a frame: one row per key, with its reducer, and the keys that changed
 * since the previous frame marked (bold, with a "changed" tag, not colour alone).
 */
import { O, type Obj } from "@/lib/engine";

export function StatePanel({
  spec,
  values,
  prev,
  title = "State",
}: {
  spec: Obj;
  values: Obj;
  prev?: Obj;
  title?: string;
}): JSX.Element {
  return (
    <div className="min-w-0 rounded bg-white p-2 ring-1 ring-neutral-200 dark:bg-neutral-950 dark:ring-neutral-800">
      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
        {title}
      </p>
      <table
        className="mt-1 w-full table-fixed text-xs"
        data-testid="state-panel"
      >
        <tbody>
          {(spec.state as Obj[]).map((s) => {
            const has = s.key in values;
            const v = has ? O.fmt(values[s.key]) : "—";
            const changed =
              prev !== undefined &&
              JSON.stringify(prev[s.key]) !== JSON.stringify(values[s.key]);
            return (
              <tr
                key={s.key}
                data-key={s.key}
                data-changed={changed ? "true" : "false"}
              >
                <td className="w-2/5 break-all py-0.5 pr-2 align-top font-mono text-neutral-700 dark:text-neutral-300">
                  {s.key}
                  {s.reducer !== "overwrite" && (
                    <span className="block text-[0.65rem] text-neutral-600 dark:text-neutral-400">
                      reducer: {s.reducer}
                    </span>
                  )}
                </td>
                <td
                  className={`break-words py-0.5 align-top font-mono ${changed ? "font-bold text-neutral-950 dark:text-white" : "text-neutral-700 dark:text-neutral-300"}`}
                >
                  {v}
                  {changed && (
                    <span className="ml-1 rounded bg-sky-100 px-1 text-[0.65rem] font-normal text-sky-900 dark:bg-sky-900 dark:text-sky-100">
                      changed
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
