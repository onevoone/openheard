import { LOCALES, type Locale } from "@openheard/i18n/locales";

const PUBLIC_PATHS = ["/", "/roadmap", "/changelog", "/widget.json"];
const PUBLIC_PATH_PREFIXES = ["/p/"];
const PRIVATE_PATHS = ["/dashboard", "/login", "/api", "/new", "/welcome", "/settings", "/demo"];

export function isPublicCacheable(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

// The widget's metadata is fetched on every host page view, from any origin,
// with whatever query string the caller likes. Only `ws` (local dev) changes
// the answer, so everything else is dropped from its cache key. It carries the
// strings of every language and is fetched without cookies, so it never
// varies by locale either.
//
// Every other page is rendered in the visitor's language: the cookie they
// picked, else their Accept-Language, else the board's own (`locale`
// undefined). That is `locales.length + 1` copies of a page at most.
export function edgeCacheKey(url: URL, locale?: Locale): string {
  if (url.pathname === "/widget.json") {
    const ws = url.searchParams.get("ws");
    return url.origin + url.pathname + (ws ? `?ws=${encodeURIComponent(ws)}` : "");
  }
  if (!locale) return url.toString();
  // `set`, not `append`: a visitor-supplied value must not pick another
  // language's copy.
  const keyed = new URL(url);
  keyed.searchParams.set("__locale", locale);
  return keyed.toString();
}

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Uploaded images and logos set their own long-lived cache headers; a session
// cookie on the request does not make an image private.
export function isImmutableAsset(pathname: string): boolean {
  return pathname.startsWith("/uploads/") || pathname.startsWith("/logo/");
}

export function hasSessionCookie(request: Request): boolean {
  const cookie = request.headers.get("cookie") ?? "";
  // The demo uses its own cookie namespace; both mean "do not cache this".
  return cookie.includes("better-auth.session_token") || cookie.includes("openheard-demo.session_token");
}

function getCache(): Cache | null {
  try {
    return (caches as unknown as { default: Cache }).default;
  } catch {
    return null;
  }
}

export async function purgeWorkspaceCache(origin: string, postIds?: number[]): Promise<void> {
  const cache = getCache();
  if (!cache) return;
  const paths = [...PUBLIC_PATHS, "/changelog.rss"];
  if (postIds) {
    for (const id of postIds) paths.push(`/p/${id}`);
  }
  // The board's-own-language copy and one per language a visitor can ask for.
  const variants: (Locale | undefined)[] = [undefined, ...LOCALES];
  await Promise.all(paths.flatMap((p) => variants.map((locale) => cache.delete(new Request(edgeCacheKey(new URL(origin + p), locale))))));
}
