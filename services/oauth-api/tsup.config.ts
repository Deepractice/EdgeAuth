import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "esnext",
  platform: "browser",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  minify: false,
  bundle: true,
  external: [],
});
