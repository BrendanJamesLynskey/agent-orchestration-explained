/**
 * MDX components map (as on the companion sites). The animations come through `lazy.tsx`, so
 * each chapter loads only its own widget's code; `Eq` renders an equation with KaTeX on the
 * server (pass it as a widget's child); `V` prints a number from the engine.
 */
import type { MDXRemoteProps } from "next-mdx-remote/rsc";

import { Layer } from "@/components/interactive/Layer";
import {
  CheckpointWidget,
  DurableWidget,
  GraphWidget,
  ReducerWidget,
} from "@/components/interactive/lazy";
import { Eq } from "@/components/mdx/Eq";
import { V } from "@/components/mdx/V";
import { Callout } from "@/components/ui/Callout";
import { MdxPre, MdxTable } from "@/components/ui/MdxTable";

export const mdxComponents: NonNullable<MDXRemoteProps["components"]> = {
  table: MdxTable,
  pre: MdxPre,
  Layer,
  Callout,
  Eq,
  V,
  GraphWidget,
  ReducerWidget,
  CheckpointWidget,
  DurableWidget,
};
