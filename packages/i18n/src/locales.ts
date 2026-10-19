// Locale list and request-header parsing that need no generated code, so the
// edge cache, tests and the compile check can use them without a build step.
// `project.inlang/settings.json` is the source of truth; i18n.test.ts fails
// when this file drifts from it.
export const LOCALES = ["uk", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const BASE_LOCALE: Locale = "uk";
export const LOCALE_COOKIE = "PARAGLIDE_LOCALE";

// Shown in the switcher in each language's own name, so it never needs translating.
export const LOCALE_NAMES: Record<Locale, string> = { uk: "Українська", en: "English" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

// The visitor's explicit choice, set by the language switcher.
export function localeFromCookie(cookieHeader: string | null | undefined): Locale | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0 || part.slice(0, eq).trim() !== LOCALE_COOKIE) continue;
    const value = part.slice(eq + 1).trim();
    return isLocale(value) ? value : undefined;
  }
  return undefined;
}

// First supported language in the visitor's preference order: `uk-UA` is
// `uk`, `en;q=0.8,uk` is `uk`, `q=0` rules a language out, `*` and languages
// we do not ship say nothing, so the board's own language applies.
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | undefined {
  if (!header) return undefined;
  const ranked: { lang: string; q: number; at: number }[] = [];
  header.split(",").forEach((item, at) => {
    const [tag = "", ...params] = item.split(";");
    const lang = tag.trim().toLowerCase();
    if (!lang || lang === "*") return;
    let q = 1;
    for (const p of params) {
      const [k, v] = p.split("=");
      if (k?.trim().toLowerCase() === "q") q = Number.parseFloat(v ?? "");
    }
    if (Number.isNaN(q) || q <= 0) return;
    ranked.push({ lang, q, at });
  });
  ranked.sort((a, b) => b.q - a.q || a.at - b.at);
  for (const { lang } of ranked) {
    const primary = lang.split("-")[0];
    if (isLocale(primary)) return primary;
  }
  return undefined;
}

// What the request itself says about its language, before the database is
// asked: cookie, then Accept-Language. Undefined means "the board's language".
export function localeFromRequest(request: Request): Locale | undefined {
  return localeFromCookie(request.headers.get("cookie")) ?? localeFromAcceptLanguage(request.headers.get("accept-language"));
}
