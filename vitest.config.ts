/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/coverage/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      thresholds: {
        lines: 90,
        functions: 95,
        branches: 80,
        statements: 90,
      },
    },
  },
});
