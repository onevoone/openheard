import { afterEach, describe, expect, it, vi } from "vitest";

import { edgeCacheKey, hasSessionCookie, purgeWorkspaceCache } from "./cache";

const url = (path: string) => new URL(`https://acme.example.com${path}`);

describe("edgeCacheKey", () => {
  it("is the plain URL when the request names no language", () => {
    expect(edgeCacheKey(url("/roadmap"))).toBe("https://acme.example.com/roadmap");
  });

  it("keeps one copy per language", () => {
    const uk = edgeCacheKey(url("/"), "uk");
    const en = edgeCacheKey(url("/"), "en");
    expect(new Set([uk, en, edgeCacheKey(url("/"))]).size).toBe(3);
  });

  it("keeps the query string of the page", () => {
    expect(edgeCacheKey(url("/?q=dark"), "en")).toBe("https://acme.example.com/?q=dark&__locale=en");
  });

  it("does not let a visitor pick another language's copy", () => {
    expect(edgeCacheKey(url("/?__locale=en"), "uk")).toBe(edgeCacheKey(url("/"), "uk"));
  });

  it("never varies the widget's metadata, which holds every language and is fetched without cookies", () => {
    expect(edgeCacheKey(url("/widget.json?x=1"), "en")).toBe("https://acme.example.com/widget.json");
    expect(edgeCacheKey(url("/widget.json?ws=beta"), "uk")).toBe("https://acme.example.com/widget.json?ws=beta");
  });
});

describe("hasSessionCookie", () => {
  const req = (cookie: string) => new Request("https://acme.example.com/", { headers: { cookie } });

  it("does not treat the language cookie as a session", () => {
    expect(hasSessionCookie(req("PARAGLIDE_LOCALE=en"))).toBe(false);
  });

  it("still sees a session next to it", () => {
    expect(hasSessionCookie(req("PARAGLIDE_LOCALE=en; better-auth.session_token=abc"))).toBe(true);
  });
});

describe("purgeWorkspaceCache", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("deletes the board-language copy and every language's copy of each page", async () => {
    const deleted: string[] = [];
    vi.stubGlobal("caches", { default: { delete: async (r: Request) => void deleted.push(r.url) } });
    await purgeWorkspaceCache("https://acme.example.com", [7]);
    for (const path of ["/", "/roadmap", "/changelog", "/p/7"]) {
      const base = `https://acme.example.com${path}`;
      const sep = base.includes("?") ? "&" : "?";
      expect(deleted, path).toContain(base);
      expect(deleted, path).toContain(`${base}${sep}__locale=uk`);
      expect(deleted, path).toContain(`${base}${sep}__locale=en`);
    }
    expect(deleted).toContain("https://acme.example.com/widget.json");
    expect(deleted).toContain("https://acme.example.com/changelog.rss");
  });
});
