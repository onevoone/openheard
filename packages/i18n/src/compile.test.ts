import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { COMPILER_OPTIONS } from "./config";
import { BASE_LOCALE, LOCALES, LOCALE_COOKIE } from "./locales";

// What `bun run i18n:compile` (and the Vite plugin, which spreads the same
// options) actually generated, read back from the runtime it wrote.
const runtime = readFileSync(resolve(import.meta.dirname, "paraglide/runtime.js"), "utf8");
const constant = (name: string) => new RegExp(`export const ${name} =\\s*(?:/\\*[^]*?\\*/\\s*)?\\(?([^;]*?)\\)?;`).exec(runtime)?.[1]?.trim();

describe("compiled runtime", () => {
  it("uses the strategy order from config.ts", () => {
    const body = /export const strategy = \[([^\]]*)\]/.exec(runtime)?.[1] ?? "";
    expect(body.match(/"[^"]+"/g)?.map((s) => s.slice(1, -1))).toEqual([...COMPILER_OPTIONS.strategy]);
  });

  it("uses the cookie name, sameSite and secure settings from config.ts", () => {
    expect(COMPILER_OPTIONS.cookieName).toBe(LOCALE_COOKIE);
    expect(constant("cookieName")).toBe(`"${LOCALE_COOKIE}"`);
    expect(constant("cookieSameSite")).toBe(`"${COMPILER_OPTIONS.cookieSameSite}"`);
    expect(constant("cookieSecure")).toBe(`"${COMPILER_OPTIONS.cookieSecure}"`);
  });

  it("has the locales and base locale from the project", () => {
    expect(constant("baseLocale")).toBe(`"${BASE_LOCALE}"`);
    const list = /export const locales = [^[]*\[([^\]]*)\]/.exec(runtime)?.[1] ?? "";
    expect(list.match(/"[^"]+"/g)?.map((s) => s.slice(1, -1))).toEqual([...LOCALES]);
  });
});
