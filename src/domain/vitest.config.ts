import { defineConfig, mergeConfig } from "vitest/config";
import { vitest } from "@deepracticex/config-preset/vitest";
import path from "node:path";

export default mergeConfig(
  vitest.base,
  defineConfig({
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "."),
      },
    },
  }),
);
