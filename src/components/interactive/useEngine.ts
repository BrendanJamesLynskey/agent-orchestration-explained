"use client";

/**
 * Everything a chapter animates, computed by the vendored engine in the browser. The orchestration
 * module is small and fast (a whole chapter takes a few milliseconds), so it runs on the main
 * thread after the page loads, in the widget's own code-split chunk; results are cached per chapter.
 * The two heavy chapters (the load sweep and the chooser: thousands of simulated workflows) load
 * the same engine's output from src/data/precomputed.json instead (tests/unit/precomputed.test.ts).
 */
import { useEffect, useState } from "react";

import type { Chapter, Obj } from "@/lib/engine";

export type EngineState =
  | { status: "loading" }
  | { status: "ready"; data: Obj }
  | { status: "error"; error: string };

const cache = new Map<Chapter, Promise<Obj>>();

export function loadChapter(chapter: Chapter): Promise<Obj> {
  let p = cache.get(chapter);
  if (!p) {
    p =
      chapter === "scale" || chapter === "choose"
        ? import("@/data/precomputed.json").then(
            (m) => (m.default as Obj)[chapter] as Obj,
          )
        : import("@/lib/engine").then((E) => E.runChapter(chapter));
    cache.set(chapter, p);
  }
  return p;
}

export function useEngine(chapter: Chapter): EngineState {
  const [state, setState] = useState<EngineState>({ status: "loading" });
  useEffect(() => {
    let live = true;
    loadChapter(chapter).then(
      (data) => live && setState({ status: "ready", data }),
      (e: Error) => live && setState({ status: "error", error: e.message }),
    );
    return () => {
      live = false;
    };
  }, [chapter]);
  return state;
}
