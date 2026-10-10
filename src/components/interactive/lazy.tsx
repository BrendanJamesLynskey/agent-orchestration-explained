"use client";

/**
 * Code-split client widgets: each loads its own chunk after the page shell, so pages stay
 * light (the pattern of the companion sites' lazy.tsx). Each widget takes its equation as
 * server-rendered children.
 */
import dynamic from "next/dynamic";

function Placeholder({ what }: { what: string }): JSX.Element {
  return (
    <p
      data-pending-widget
      className="my-8 min-h-96 text-sm text-neutral-600 dark:text-neutral-400"
    >
      Loading the {what}…
    </p>
  );
}

const loading = (what: string) =>
  function Loading(): JSX.Element {
    return <Placeholder what={what} />;
  };

export const GraphWidget = dynamic(() => import("./GraphWidget"), {
  ssr: false,
  loading: loading("animation"),
});
export const ReducerWidget = dynamic(() => import("./ReducerWidget"), {
  ssr: false,
  loading: loading("animation"),
});
export const CheckpointWidget = dynamic(() => import("./CheckpointWidget"), {
  ssr: false,
  loading: loading("animation"),
});
export const DurableWidget = dynamic(() => import("./DurableWidget"), {
  ssr: false,
  loading: loading("animation"),
});
export const PatternsWidget = dynamic(() => import("./PatternsWidget"), {
  ssr: false,
  loading: loading("animation"),
});
export const FanoutWidget = dynamic(() => import("./FanoutWidget"), {
  ssr: false,
  loading: loading("animation"),
});
export const ReliabilityWidget = dynamic(() => import("./ReliabilityWidget"), {
  ssr: false,
  loading: loading("animation"),
});
export const ScaleWidget = dynamic(() => import("./ScaleWidget"), {
  ssr: false,
  loading: loading("animation"),
});
export const ChooserWidget = dynamic(() => import("./ChooserWidget"), {
  ssr: false,
  loading: loading("animation"),
});
