/**
 * Site-wide constants: this site's URL, its companion sites, the engine, the owner's slide
 * series and notes it links into, the primary sources, and its repository.
 */

/** This site (production). */
export const SITE_URL = "https://agent-orchestration-explained.vercel.app";

/** The companion sites. */
export const DECODER_URL = "https://transformer-decoder-explained.vercel.app";
export const INFERENCE_URL = "https://llm-inference-explained.vercel.app";
export const ARCHITECTURES_URL =
  "https://llm-architectures-explained.vercel.app";
export const KERNELS_URL = "https://gpu-kernels-explained.vercel.app";
export const NUMERICS_URL = "https://numerics-explained.vercel.app";
export const SILICON_URL = "https://systolic-arrays-explained.vercel.app";
export const TRADEOFFS_URL = "https://inference-tradeoffs-explained.vercel.app";
export const HARNESSES_URL = "https://agent-harnesses-explained.vercel.app";
export const PROTOCOLS_URL = "https://agent-protocols-explained.vercel.app";
export const CONTEXT_URL = "https://agent-context-explained.vercel.app";

export const GITHUB_URL =
  "https://github.com/BrendanJamesLynskey/agent-orchestration-explained";
export const ENGINE_URL =
  "https://github.com/BrendanJamesLynskey/Agent_Loop_Sim";

/** Primary sources (accessed 2026-10-10). */
export const LANGGRAPH_REPO = "https://github.com/langchain-ai/langgraph";
export const LANGGRAPH_PYPI = "https://pypi.org/project/langgraph/1.2.14/";
export const LANGGRAPH_GRAPH_API =
  "https://docs.langchain.com/oss/python/langgraph/graph-api";
export const LANGGRAPH_PERSISTENCE =
  "https://docs.langchain.com/oss/python/langgraph/persistence";
export const LANGGRAPH_INTERRUPTS =
  "https://docs.langchain.com/oss/python/langgraph/interrupts";
export const LANGGRAPH_TIME_TRAVEL =
  "https://docs.langchain.com/oss/python/langgraph/use-time-travel";
export const TEMPORAL_WORKFLOWS =
  "https://docs.temporal.io/workflow-definition";
export const PREGEL_DOI = "https://doi.org/10.1145/1807167.1807184";

/** The owner's slides and notes the chapters link into ("go deeper"). */
export const AGENTS_HUB =
  "https://brendanjameslynskey.github.io/LLM_Hub_Agents/";
export const INTRO_LANGGRAPH =
  "https://brendanjameslynskey.github.io/Introduction_to_LangGraph/";
export const INTERVIEW_LANGGRAPH =
  "https://github.com/BrendanJamesLynskey/Interview_LangGraph";
export const RASCHKA_LANGGRAPH =
  "https://github.com/BrendanJamesLynskey/Raschka_Coding_Agent_LangGraph";

/** A file in this site's repository on GitHub. */
export function repoFile(path: string): string {
  return `${GITHUB_URL}/blob/main/${path}`;
}
