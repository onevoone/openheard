import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const workspaceLocale = vi.fn();
const workspaceSlugFromRequest = vi.fn();
vi.mock("./workspace-locale", () => ({ workspaceLocale }));
vi.mock("./session", () => ({ workspaceSlugFromRequest }));

const { localeForRequest, localeFromWidget, localeLookupFailed } = await import("./locale");

const req = (headers: Record<string, string> = {}, path = "/") => new Request(`https://acme.example.com${path}`, { headers });

beforeEach(() => {
  workspaceLocale.mockReset();
  workspaceSlugFromRequest.mockReset().mockResolvedValue("acme");
});
afterEach(() => vi.restoreAllMocks());

describe("localeForRequest", () => {
  it("answers from the cookie or Accept-Language without asking the database", async () => {
    expect(await localeForRequest(req({ cookie: "PARAGLIDE_LOCALE=en" }))).toBe("en");
    expect(await localeForRequest(req({ "accept-language": "en-US" }))).toBe("en");
    expect(workspaceLocale).not.toHaveBeenCalled();
  });

  it("falls back to the workspace's language", async () => {
    workspaceLocale.mockResolvedValue("en");
    const request = req({ "accept-language": "ru" });
    expect(await localeForRequest(request)).toBe("en");
    expect(localeLookupFailed(request)).toBe(false);
  });

  it("says nothing for a workspace without a language, and that is not a failure", async () => {
    workspaceLocale.mockResolvedValue(null);
    const request = req();
    expect(await localeForRequest(request)).toBeUndefined();
    expect(localeLookupFailed(request)).toBe(false);
  });

  it("logs a failed lookup, falls back to the base locale and marks the request", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    workspaceLocale.mockRejectedValue(new Error("D1 down"));
    const failed = req();
    const fine = req({ cookie: "PARAGLIDE_LOCALE=uk" });
    expect(await localeForRequest(failed)).toBeUndefined();
    expect(await localeForRequest(fine)).toBe("uk");
    expect(error).toHaveBeenCalledTimes(1);
    expect(localeLookupFailed(failed)).toBe(true);
    expect(localeLookupFailed(fine)).toBe(false);
  });
});

describe("the widget's language", () => {
  it("follows lang in the panel's URL, ahead of the cookie and Accept-Language", async () => {
    const request = req({ cookie: "PARAGLIDE_LOCALE=uk", "accept-language": "uk" }, "/widget?ws=acme&lang=en");
    expect(await localeForRequest(request)).toBe("en");
    expect(workspaceLocale).not.toHaveBeenCalled();
  });

  it("reads a preference list and takes the first language it ships", () => {
    expect(localeFromWidget(req({}, "/widget?lang=de,uk,en"))).toBe("uk");
    expect(localeFromWidget(req({}, "/widget?lang=en-GB"))).toBe("en");
    expect(localeFromWidget(req({}, "/widget?lang=UK-ua"))).toBe("uk");
  });

  it("ignores a language it does not ship, and falls through the usual chain", async () => {
    expect(localeFromWidget(req({}, "/widget?lang=de,fr"))).toBeUndefined();
    expect(localeFromWidget(req({}, "/widget?lang=*"))).toBeUndefined();
    expect(localeFromWidget(req({}, "/widget?lang="))).toBeUndefined();
    expect(await localeForRequest(req({ cookie: "PARAGLIDE_LOCALE=en" }, "/widget?lang=de"))).toBe("en");
    workspaceLocale.mockResolvedValue("uk");
    expect(await localeForRequest(req({}, "/widget?lang=de"))).toBe("uk");
  });

  it("reads lang on the sign-in popup too, and nowhere else", () => {
    expect(localeFromWidget(req({}, "/widget/connect?nonce=x&lang=en"))).toBe("en");
    for (const path of ["/?lang=en", "/roadmap?lang=en", "/p/1?lang=en", "/widget.json?lang=en", "/widget.js?lang=en", "/widgets?lang=en", "/widget/other?lang=en"]) {
      expect(localeFromWidget(req({}, path)), path).toBeUndefined();
    }
  });

  it("reads the panel's server function calls from x-openheard-lang", async () => {
    const call = (headers: Record<string, string>, path = "/_serverFn/abc") => req(headers, path);
    expect(await localeForRequest(call({ "x-openheard-lang": "en", cookie: "PARAGLIDE_LOCALE=uk" }))).toBe("en");
    expect(localeFromWidget(call({ "x-openheard-lang": "xx" }))).toBeUndefined();
    // The header means nothing on a page, which the edge caches by cookie and Accept-Language.
    expect(localeFromWidget(call({ "x-openheard-lang": "en" }, "/roadmap"))).toBeUndefined();
    expect(localeFromWidget(call({ "x-openheard-lang": "en" }, "/widget.json"))).toBeUndefined();
  });

  it("cuts an absurdly long list instead of parsing it", () => {
    expect(localeFromWidget(req({}, `/widget?lang=${"x,".repeat(200)}en`))).toBeUndefined();
  });
});
