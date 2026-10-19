import { describe, expect, it } from "vitest";

import { localeFromAcceptLanguage, localeFromCookie, localeFromRequest } from "./locales";

const req = (headers: Record<string, string>) => new Request("https://acme.example/", { headers });

describe("localeFromAcceptLanguage", () => {
  it("maps a regional tag to its language", () => {
    expect(localeFromAcceptLanguage("uk-UA")).toBe("uk");
    expect(localeFromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
    expect(localeFromAcceptLanguage("EN-gb")).toBe("en");
  });

  it("follows the quality order, not the written order", () => {
    expect(localeFromAcceptLanguage("en;q=0.8,uk")).toBe("uk");
    expect(localeFromAcceptLanguage("uk;q=0.5,en;q=0.9")).toBe("en");
    expect(localeFromAcceptLanguage("de,en;q=0.7,uk;q=0.7")).toBe("en");
  });

  it("skips languages we do not ship", () => {
    expect(localeFromAcceptLanguage("ru-RU,ru;q=0.9,en;q=0.5")).toBe("en");
    expect(localeFromAcceptLanguage("ru,de;q=0.8")).toBeUndefined();
    expect(localeFromAcceptLanguage("ukr")).toBeUndefined();
  });

  it("says nothing for a wildcard, an empty or a missing header", () => {
    expect(localeFromAcceptLanguage("*")).toBeUndefined();
    expect(localeFromAcceptLanguage("")).toBeUndefined();
    expect(localeFromAcceptLanguage(null)).toBeUndefined();
    expect(localeFromAcceptLanguage(undefined)).toBeUndefined();
  });

  it("treats q=0 as a refusal and ignores malformed weights", () => {
    expect(localeFromAcceptLanguage("en;q=0,uk;q=0.1")).toBe("uk");
    expect(localeFromAcceptLanguage("en;q=0")).toBeUndefined();
    expect(localeFromAcceptLanguage("en;q=oops,uk")).toBe("uk");
  });

  it("tolerates spacing and stray commas", () => {
    expect(localeFromAcceptLanguage(" , en ; q=0.4 , uk ; q=0.6 ,")).toBe("uk");
  });
});

describe("localeFromCookie", () => {
  it("reads the locale cookie among others", () => {
    expect(localeFromCookie("a=1; PARAGLIDE_LOCALE=en; b=2")).toBe("en");
    expect(localeFromCookie("PARAGLIDE_LOCALE=uk")).toBe("uk");
  });

  it("skips an invalid value of the same cookie to find a valid one", () => {
    expect(localeFromCookie("PARAGLIDE_LOCALE=fr; PARAGLIDE_LOCALE=en")).toBe("en");
    expect(localeFromCookie("PARAGLIDE_LOCALE=; PARAGLIDE_LOCALE=uk; PARAGLIDE_LOCALE=en")).toBe("uk");
  });

  it("ignores unknown values, lookalike names and a missing header", () => {
    expect(localeFromCookie("PARAGLIDE_LOCALE=fr")).toBeUndefined();
    expect(localeFromCookie("XPARAGLIDE_LOCALE=en")).toBeUndefined();
    expect(localeFromCookie("")).toBeUndefined();
    expect(localeFromCookie(null)).toBeUndefined();
  });
});

describe("localeFromRequest", () => {
  it("prefers the cookie over Accept-Language", () => {
    expect(localeFromRequest(req({ cookie: "PARAGLIDE_LOCALE=uk", "accept-language": "en" }))).toBe("uk");
  });

  it("falls back to Accept-Language, then to nothing", () => {
    expect(localeFromRequest(req({ "accept-language": "en-US" }))).toBe("en");
    expect(localeFromRequest(req({ cookie: "PARAGLIDE_LOCALE=fr", "accept-language": "en" }))).toBe("en");
    expect(localeFromRequest(req({}))).toBeUndefined();
  });
});
