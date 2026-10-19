import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // the learning layer's test renders a component (React 17+ JSX runtime)
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@content": path.resolve(__dirname, "./content"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    testTimeout: 60_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/lib/**/*.ts"],
      // the vendored engine is tested in Agent_Loop_Sim (exact parity with its Python
      // reference); here its files are checked byte for byte against VENDORED.json
      exclude: [
        "src/lib/engine/vendor/**",
        "src/lib/engine/engine.worker.ts",
        // the MDX component map (React components only)
        "src/lib/mdx/components.ts",
      ],
      thresholds: {
        // the captions and the values the prose quotes
        "src/lib/orch/**": {
          lines: 100,
          functions: 100,
          statements: 100,
          branches: 90,
        },
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
});
