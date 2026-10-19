import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { BASE_LOCALE, LOCALES } from "./locales";

const read = (rel: string) => JSON.parse(readFileSync(resolve(import.meta.dirname, rel), "utf8")) as Record<string, unknown>;

const messages = Object.fromEntries(LOCALES.map((l) => [l, read(`../messages/${l}.json`)]));
const keysOf = (locale: string) => Object.keys(messages[locale]!).filter((k) => k !== "$schema");

// Every `{name}` a message uses. Plural messages are objects, not strings, and
// are covered by the compiler; strings are what the pilot uses.
function placeholders(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return [...value.matchAll(/\{\s*([A-Za-z_][\w]*)\s*\}/g)].map((m) => m[1]!).sort();
}

describe("project.inlang settings", () => {
  const settings = read("../project.inlang/settings.json");

  it("match the locale list in locales.ts", () => {
    expect(settings.baseLocale).toBe(BASE_LOCALE);
    expect(settings.locales).toEqual([...LOCALES]);
  });

  it("load the message-format plugin from node_modules, not a CDN", () => {
    for (const mod of settings.modules as string[]) expect(mod).not.toMatch(/^https?:/);
  });
});

describe("messages", () => {
  const base = keysOf(BASE_LOCALE);

  it("have the same keys in every locale", () => {
    for (const locale of LOCALES) expect(keysOf(locale), locale).toEqual(base);
  });

  it("keep keys sorted, so parallel changes merge cleanly", () => {
    for (const locale of LOCALES) expect(keysOf(locale), locale).toEqual([...keysOf(locale)].sort());
  });

  it("use flat snake_case keys", () => {
    for (const key of base) expect(key).toMatch(/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/);
  });

  it("have no empty text", () => {
    for (const locale of LOCALES)
      for (const key of keysOf(locale)) expect(messages[locale]![key], `${locale}.${key}`).not.toBe("");
  });

  it("use the same placeholders in every locale", () => {
    for (const key of base) {
      const expected = placeholders(messages[BASE_LOCALE]![key]);
      for (const locale of LOCALES) expect(placeholders(messages[locale]![key]), `${locale}.${key}`).toEqual(expected);
    }
  });
});
