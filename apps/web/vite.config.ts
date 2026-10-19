import tailwindcss from "@tailwindcss/vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const local = process.env.OPENHEARD_LOCAL === "1";

export default defineConfig({
  server: {
    port: 3001,
  },
  build: {
    modulePreload: { polyfill: false },
    rollupOptions: {
      // resolved by workerd at runtime; node builds cannot bundle it
      external: local ? [] : ["cloudflare:workers"],
    },
    rolldownOptions: {
      external: local ? [] : ["cloudflare:workers"],
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            },
          ],
        },
      },
    },
  },
  resolve: {
    tsconfigPaths: true,
    alias: local
      ? { "cloudflare:workers": fileURLToPath(new URL("../../packages/env/src/local.ts", import.meta.url)) }
      : {},
  },
  ssr: {
    // native sqlite driver stays external in local mode
    external: ["@libsql/client", "libsql"],
  },
  environments: {
    ssr: {
      build: {
        // One server file. Split chunks can import each other in a cycle on workerd
        // and evaluate a drizzle table before its base class exists.
        rolldownOptions: { output: { inlineDynamicImports: true, codeSplitting: false } },
      },
    },
  },
  plugins: [
    // Compiles packages/i18n/messages/*.json into typed message functions, on
    // build and on every edit in dev. `custom-openheard` is the server-side
    // chain in src/lib/locale.ts; `custom-htmlLang` makes the browser agree
    // with what the server rendered (src/lib/locale-client.ts).
    paraglideVitePlugin({
      project: "../../packages/i18n/project.inlang",
      outdir: "../../packages/i18n/src/paraglide",
      outputStructure: "message-modules",
      strategy: ["custom-openheard", "custom-htmlLang", "cookie", "baseLocale"],
      isServer: "import.meta.env.SSR",
      cookieName: "PARAGLIDE_LOCALE",
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact({ compiler: true }),
  ],
});
