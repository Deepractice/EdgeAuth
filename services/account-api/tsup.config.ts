import { tsup } from "@deepracticex/config-preset";
import type { Options } from "tsup";

export default tsup.createConfig({
  entry: ["src/index.ts"],
  external: [],
}) as Options;
