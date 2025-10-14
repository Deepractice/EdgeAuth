import { defineConfig } from "vitest/config";
import { vitestCucumber } from "@deepracticex/vitest-cucumber/plugin";
import { resolve } from "path";

export default defineConfig({
  plugins: [vitestCucumber()],
  test: {
    include: ["**/*.feature"],
  },
  resolve: {
    alias: {
      "@edge-auth/core/domain": resolve(__dirname, "../../src/domain/index.ts"),
      "@edge-auth/core/core": resolve(__dirname, "../../src/core/index.ts"),
    },
  },
});
