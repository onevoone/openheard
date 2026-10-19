import { compile } from "@inlang/paraglide-js";

import { COMPILER_OPTIONS } from "../src/config";

// `bun run i18n:compile`: the messages into src/paraglide, with the same
// options the Vite plugin uses.
await compile({
  project: "./project.inlang",
  outdir: "./src/paraglide",
  ...COMPILER_OPTIONS,
  strategy: [...COMPILER_OPTIONS.strategy],
});
