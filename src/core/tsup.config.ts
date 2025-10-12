import { tsup } from "@deepracticex/config-preset";
import type { Options } from "tsup";

export default tsup.createConfig({
  entry: ["index.ts", "crypto/index.ts", "jwt/index.ts", "persistence/index.ts"],
  external: ["edge-auth-domain"],
}) as Options;
