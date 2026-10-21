import { type Locale, localeFromAcceptLanguage, localeFromRequest } from "@openheard/i18n/locales";
import { defineCustomServerStrategy } from "@openheard/i18n/runtime";

import { WIDGET_LANG_HEADER } from "./widget-auth";
import { workspaceLocale } from "./workspace-locale";

// Which language does this request get? What the widget loader asked for, if
// this is the widget, then the visitor's cookie (their explicit choice), then
// Accept-Language, then the language the workspace's admin set, then the base
// locale. All but the last two are read off the request; only the workspace
// needs the database (workspace-locale.ts caches it).
// Server-only: the browser follows what the server rendered (locale-client.ts).

// Requests whose workspace language could not be read. They get the base
// locale, which is right more often than a failed page, but it may not be the
// workspace's language, so the edge cache must not keep that page (server.ts).
const lookupFailed = new WeakSet<Request>();

export function localeLookupFailed(request: Request): boolean {
  return lookupFailed.has(request);
}

const WIDGET_PAGES = ["/widget", "/widget/connect"];
// A preference list is a few tags; anything longer is not one.
const WIDGET_LANG_MAX = 120;

// The language the widget loader passed on: `lang` in the iframe's URL (and the
// sign-in popup's), `x-openheard-lang` on the panel's server function calls.
// Both hold the loader's own order of preference, `data-lang` first and then
// the browser's languages, so the panel lands on the language of the launcher.
// It beats the cookie on purpose: the cookie only reaches an iframe on another
// site when the browser allows third-party cookies, so letting it win would make
// the panel's language depend on the browser, not on the host page. Nothing
// else listens to `lang`: other pages are cached per cookie and Accept-Language
// (cache.ts), and a parameter that changed their language would poison that cache.
export function localeFromWidget(request: Request): Locale | undefined {
  const { pathname, searchParams } = new URL(request.url);
  const asked = WIDGET_PAGES.includes(pathname)
    ? searchParams.get("lang")
    : pathname.startsWith("/_serverFn/")
      ? request.headers.get(WIDGET_LANG_HEADER)
      : null;
  return asked ? localeFromAcceptLanguage(asked.slice(0, WIDGET_LANG_MAX)) : undefined;
}

export async function localeForRequest(request: Request): Promise<Locale | undefined> {
  const fromRequest = localeFromWidget(request) ?? localeFromRequest(request);
  if (fromRequest) return fromRequest;
  try {
    const { workspaceSlugFromRequest } = await import("./session");
    return (await workspaceLocale(await workspaceSlugFromRequest(request))) ?? undefined;
  } catch (err) {
    // A database that is down or not migrated yet, say.
    console.error("workspace language lookup failed, using the base locale:", err);
    lookupFailed.add(request);
    return undefined;
  }
}

let registered = false;

// Paraglide runs custom server strategies before its built-in ones whatever
// the order, so the widget, cookie and Accept-Language checks live in here too.
export function registerServerLocaleStrategy() {
  if (registered) return;
  registered = true;
  defineCustomServerStrategy("custom-openheard", {
    getLocale: (request) => (request ? localeForRequest(request) : undefined),
  });
}
