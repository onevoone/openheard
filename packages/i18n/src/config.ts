import { LOCALE_COOKIE } from "./locales";

// Compiler options that `vite.config.ts` (the dev server and the build) and
// `scripts/compile.ts` (tests, check-types, CI) must agree on; both spread this
// object, and compile.test.ts checks the generated runtime against it.
//
// `custom-openheard` is the server-side chain in apps/web/src/lib/locale.ts and
// `custom-htmlLang` makes the browser follow what the server rendered
// (locale-client.ts); `cookie` is the visitor's own choice from the switcher.
export const COMPILER_OPTIONS = {
  outputStructure: "message-modules",
  strategy: ["custom-openheard", "custom-htmlLang", "cookie", "baseLocale"],
  cookieName: LOCALE_COOKIE,
  cookieSameSite: "lax",
  cookieSecure: "auto",
} as const;
