import { tsup } from "@deepracticex/config-preset";
import type { Options } from "tsup";

export default tsup.createConfig({
  entry: ["index.ts", "user/index.ts"],
}) as Options;
