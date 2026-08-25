import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // "server-only" is a Next.js guard; tests run outside Next.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // DB-backed suites share one disposable Postgres — never run files in
    // parallel against it.
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});