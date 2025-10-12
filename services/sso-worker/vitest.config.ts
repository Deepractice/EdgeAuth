import { defineConfig } from "vitest/config";
import { vitestCucumber } from "@deepracticex/vitest-cucumber-plugin";
import { resolve } from "path";

export default defineConfig({
  plugins: [vitestCucumber()],
  test: {
    include: ["**/*.feature"],
  },
  resolve: {
    alias: {
      "edgeauth/domain": resolve(__dirname, "../../src/domain/index.ts"),
      "edgeauth/core": resolve(__dirname, "../../src/core/index.ts"),
    },
  },
});
