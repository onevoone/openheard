import { LOCALES, type Locale } from "@openheard/i18n/locales";

const LOCALE_PARAM = "__locale";
const PUBLIC_PATHS = ["/", "/roadmap", "/changelog", "/widget.json"];
const PUBLIC_PATH_PREFIXES = ["/p/"];
const PRIVATE_PATHS = ["/dashboard", "/login", "/api", "/new", "/welcome", "/settings", "/demo"];

export function isPublicCacheable(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

// Pages that are rendered in the visitor's language. /widget.json is public
// and cacheable too, but is fetched cross-origin without cookies and does not
// depend on the language: it carries the loader's words for every language
// and the loader picks one, so it keeps a single copy.
export function isLocaleKeyed(pathname: string): boolean {
  return isPublicCacheable(pathname) && pathname !== "/widget.json";
}

// The widget's metadata is fetched on every host page view, from any origin,
// with whatever query string the caller likes. Only `ws` (local dev) changes
// the answer, so everything else is dropped from its cache key.
//
// Every other page is rendered in the visitor's language: the cookie they
// picked, else their Accept-Language, else the board's own (`locale`
// undefined). That is `locales.length + 1` copies of a page at most. The
// language rides in a `__locale` query parameter of the key, so any `__locale`
// the visitor sent is dropped first: it must never name another copy.
export function edgeCacheKey(url: URL, locale?: Locale): string {
  if (url.pathname === "/widget.json") {
    const ws = url.searchParams.get("ws");
    return url.origin + url.pathname + (ws ? `?ws=${encodeURIComponent(ws)}` : "");
  }
  const keyed = new URL(url);
  keyed.searchParams.delete(LOCALE_PARAM);
  if (locale) keyed.searchParams.set(LOCALE_PARAM, locale);
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
  // Every copy of a page: the board's-own-language one, then one per language.
  const variants: (Locale | undefined)[] = [undefined, ...LOCALES];
  const keys = new Set<string>();
  for (const p of paths) {
    const url = new URL(origin + p);
    for (const locale of isLocaleKeyed(url.pathname) ? variants : [undefined]) keys.add(edgeCacheKey(url, locale));
  }
  await Promise.all([...keys].map((key) => cache.delete(new Request(key))));
}
