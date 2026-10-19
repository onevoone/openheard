import { type Locale, localeFromRequest } from "@openheard/i18n/locales";
import { defineCustomServerStrategy } from "@openheard/i18n/runtime";

import { workspaceLocale } from "./workspace-locale";

// Which language does this request get? The visitor's cookie (their explicit
// choice), then Accept-Language, then the language the workspace's admin set,
// then the base locale. The first two are read off the request; only the
// workspace needs the database (workspace-locale.ts caches it).
// Server-only: the browser follows what the server rendered (locale-client.ts).

// Requests whose workspace language could not be read. They get the base
// locale, which is right more often than a failed page, but it may not be the
// workspace's language, so the edge cache must not keep that page (server.ts).
const lookupFailed = new WeakSet<Request>();

export function localeLookupFailed(request: Request): boolean {
  return lookupFailed.has(request);
}

export async function localeForRequest(request: Request): Promise<Locale | undefined> {
  const fromRequest = localeFromRequest(request);
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
// the order, so the cookie and Accept-Language checks live in here too.
export function registerServerLocaleStrategy() {
  if (registered) return;
  registered = true;
  defineCustomServerStrategy("custom-openheard", {
    getLocale: (request) => (request ? localeForRequest(request) : undefined),
  });
}
