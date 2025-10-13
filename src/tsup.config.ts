import { tsup } from "@deepracticex/config-preset";
import type { Options } from "tsup";

export default tsup.createConfig({
  entry: ["index.ts"],
  external: [],
}) as Options;
