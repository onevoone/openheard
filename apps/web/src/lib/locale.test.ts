import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const workspaceLocale = vi.fn();
const workspaceSlugFromRequest = vi.fn();
vi.mock("./workspace-locale", () => ({ workspaceLocale }));
vi.mock("./session", () => ({ workspaceSlugFromRequest }));

const { localeForRequest, localeLookupFailed } = await import("./locale");

const req = (headers: Record<string, string> = {}) => new Request("https://acme.example.com/", { headers });

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
