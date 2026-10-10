/**
 * <V of="graph.sessions.fanout.supersteps.graph_ms" fmt="f3" />: a number from the engine's runs,
 * formatted, in running prose. Server Component.
 */
import { formatValue, lookup, type Fmt } from "@/lib/orch/values";

export function V({ of, fmt = "num" }: { of: string; fmt?: Fmt }): JSX.Element {
  return <span data-v={of}>{formatValue(lookup(of), fmt)}</span>;
}
