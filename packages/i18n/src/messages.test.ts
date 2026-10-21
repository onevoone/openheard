import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { BASE_LOCALE, LOCALES } from "./locales";

const read = (rel: string) => JSON.parse(readFileSync(resolve(import.meta.dirname, rel), "utf8")) as Record<string, unknown>;

const messages = Object.fromEntries(LOCALES.map((l) => [l, read(`../messages/${l}.json`)]));
const keysOf = (locale: string) => Object.keys(messages[locale]!).filter((k) => k !== "$schema");

// Every `{name}` a message uses. A plural message is an array of variants; it
// uses what it declares as input and what its branches interpolate.
function placeholders(value: unknown): string[] {
  const found = new Set<string>();
  const scan = (text: string) => {
    for (const m of text.matchAll(/\{\s*([A-Za-z_][\w]*)\s*\}/g)) found.add(m[1]!);
  };
  if (typeof value === "string") scan(value);
  else if (Array.isArray(value))
    for (const variant of value as { declarations?: string[]; match?: Record<string, string> }[]) {
      for (const d of variant.declarations ?? []) {
        const input = /^input\s+(\w+)/.exec(d);
        if (input) found.add(input[1]!);
      }
      for (const text of Object.values(variant.match ?? {})) scan(text);
    }
  return [...found].sort();
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

  // Ukrainian counts need one/few/many; a message that forgets a category
  // falls back to its key in front of a visitor.
  const CATEGORIES: Record<string, string[]> = { uk: ["one", "few", "many", "other"], en: ["one", "other"] };
  it("cover every plural category of their language", () => {
    for (const locale of LOCALES)
      for (const key of keysOf(locale)) {
        const value = messages[locale]![key];
        if (!Array.isArray(value)) continue;
        for (const variant of value as { match: Record<string, string> }[]) {
          const have = Object.keys(variant.match).map((k) => k.split("=")[1]);
          for (const category of CATEGORIES[locale]!) expect(have, `${locale}.${key}`).toContain(category);
        }
      }
  });

  it("use the same placeholders in every locale", () => {
    for (const key of base) {
      const expected = placeholders(messages[BASE_LOCALE]![key]);
      for (const locale of LOCALES) expect(placeholders(messages[locale]![key]), `${locale}.${key}`).toEqual(expected);
    }
  });
});
