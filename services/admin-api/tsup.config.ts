import { defineConfig } from "tsup";
import { resolve } from "path";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "esnext",
  outDir: "dist",
  bundle: true,
  minify: false,
  sourcemap: true,
  external: [],
  noExternal: ["edgeauth/domain", "edgeauth/core", "hono"],
  clean: true,
  esbuildOptions(options) {
    options.alias = {
      "edgeauth/domain": resolve(__dirname, "../../src/domain/index.ts"),
      "edgeauth/core": resolve(__dirname, "../../src/core/index.ts"),
    };
  },
});
