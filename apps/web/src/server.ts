import { localeFromRequest } from "@openheard/i18n/locales";
import { paraglideMiddleware } from "@openheard/i18n/server";
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { edgeCacheKey, hasSessionCookie, isImmutableAsset, isPrivatePath, isPublicCacheable } from "./lib/cache";
import { registerServerLocaleStrategy } from "./lib/locale";
import { frameAncestorsFor } from "./lib/widget-frame";

registerServerLocaleStrategy();

const handler = createStartHandler(defaultStreamHandler);

const REQUEST_TIMEOUT_MS = 25_000;
const MAX_CACHEABLE_BODY = 2 * 1024 * 1024;

function getEdgeCache(): Cache | null {
  try {
    return (caches as unknown as { default: Cache }).default;
  } catch {
    return null;
  }
}

const SECURITY_HEADERS: Record<string, string> = {
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

// The widget panel is the one page meant to live inside other sites' iframes,
// and only the sites its workspace allows (any, until an admin lists some).
// Everything else, the sign-in popup included, stays unframeable.
const FRAMEABLE_PATHS = ["/widget"];

// Pages are rendered in the language the cookie or Accept-Language asks for, so
// anything between us and the browser must keep a copy per value of each.
function varyOnLanguage(headers: Headers) {
  const current = headers.get("vary") ?? "";
  if (current.trim() === "*") return;
  const have = new Set(current.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean));
  const add = ["Cookie", "Accept-Language"].filter((v) => !have.has(v.toLowerCase()));
  if (add.length) headers.set("vary", [current.trim(), ...add].filter(Boolean).join(", "));
}

// `ancestors` is the frame-ancestors directive for a frameable page.
function secure(response: Response, ancestors: string | null, pathname: string): Response {
  const out = new Response(response.body, response);
  if (!isImmutableAsset(pathname)) varyOnLanguage(out.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (ancestors && k === "x-frame-options") continue;
    if (!out.headers.has(k)) out.headers.set(k, v);
  }
  if (ancestors) out.headers.set("content-security-policy", ancestors);
  return out;
}

export default {
  async fetch(request: Request, _env: unknown, ctx: ExecutionContext) {
    const { pathname } = new URL(request.url);
    const frameable = FRAMEABLE_PATHS.includes(pathname);
    const [response, ancestors] = await Promise.all([handle(request, ctx), frameable ? frameAncestorsFor(request) : null]);
    return secure(response, ancestors, pathname);
  },
  // Nightly: the public demo workspace goes back to its seed, and images that
  // were uploaded but never published, or whose post is gone, are deleted. Bindings come
  // from `cloudflare:workers`, which is live in a scheduled invocation too.
  async scheduled(_controller: ScheduledController, _env: unknown, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        const [{ createDb }, { resetDemoWorkspace }] = await Promise.all([import("@openheard/db"), import("./lib/demo-db")]);
        const { posts } = await resetDemoWorkspace(createDb());
        console.log(`demo reset: ${posts} posts`);
      })(),
    );
    ctx.waitUntil(
      (async () => {
        const [{ createDb }, { sweepOrphans, sweepUnclaimed }] = await Promise.all([import("@openheard/db"), import("./lib/attachment-db")]);
        const db = createDb();
        const unclaimed = await sweepUnclaimed(db);
        const orphans = await sweepOrphans(db);
        if (unclaimed || orphans) console.log(`uploads: swept ${unclaimed} unpublished images, ${orphans} orphaned files`);
      })(),
    );
  },
};

async function handle(request: Request, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const cache = getEdgeCache();

  if (
    cache &&
    request.method === "GET" &&
    !hasSessionCookie(request) &&
    isPublicCacheable(url.pathname)
  ) {
    // The page depends on the visitor's language, which the cache key must know
    // before anything is rendered. Cookie and Accept-Language are all that can
    // be read this early; with neither, the page is in the board's own language.
    const cacheKey = new Request(edgeCacheKey(url, localeFromRequest(request)), { method: "GET" });
    const cached = await cache.match(cacheKey);
    if (cached) {
      const resp = new Response(cached.body, cached);
      resp.headers.set("x-cache", "HIT");
      resp.headers.set("cache-control", "public, max-age=0, s-maxage=60");
      return resp;
    }

    const response = await bounded(request, url);

    if (response.status === 200) {
      const contentLength = parseInt(response.headers.get("content-length") ?? "", 10);
      const tooLarge = !isNaN(contentLength) && contentLength > MAX_CACHEABLE_BODY;

      if (!tooLarge) {
        const body = await response.arrayBuffer();

        if (body.byteLength <= MAX_CACHEABLE_BODY) {
          const stored = new Response(body, response);
          stored.headers.set("cache-control", "public, s-maxage=60");
          stored.headers.delete("set-cookie");
          stored.headers.delete("vary");
          ctx.waitUntil(cache.put(cacheKey, stored));
        }

        const out = new Response(body, response);
        out.headers.set("x-cache", "MISS");
        out.headers.set("cache-control", "public, max-age=0, s-maxage=60");
        return out;
      }
    }

    const out = new Response(response.body, response);
    out.headers.set("x-cache", "MISS");
    out.headers.set("cache-control", "public, max-age=0, s-maxage=60");
    return out;
  }

  const response = await bounded(request, url);

  if (isImmutableAsset(url.pathname)) return response;

  if (isPrivatePath(url.pathname) || hasSessionCookie(request)) {
    const out = new Response(response.body, response);
    out.headers.set("cache-control", "private, no-store");
    return out;
  }

  return response;
}

function bounded(request: Request, url: URL): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => {
      console.error(`request timeout: ${request.method} ${url.host}${url.pathname}`);
      resolve(new Response("Service temporarily unavailable", {
        status: 503,
        headers: { "content-type": "text/plain" },
      }));
    }, REQUEST_TIMEOUT_MS);

    // The original request goes in, not the one the middleware hands back: the
    // locale is stored for this request's async context, and the router does
    // no URL rewriting for us to undo.
    Promise.resolve(paraglideMiddleware(request, () => handler(request))).then(
      (res: Response) => { clearTimeout(timer); resolve(res); },
      (err: unknown) => { clearTimeout(timer); reject(err); },
    );
  });
}
