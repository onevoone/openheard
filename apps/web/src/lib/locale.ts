import { type Locale, localeFromRequest } from "@openheard/i18n/locales";
import { defineCustomServerStrategy } from "@openheard/i18n/runtime";

import { workspaceLocale } from "./workspace-locale";

// Which language does this request get? The visitor's cookie (their explicit
// choice), then Accept-Language, then the language the workspace's admin set,
// then the base locale. The first two are read off the request; only the
// workspace needs the database (workspace-locale.ts caches it).
// Server-only: the browser follows what the server rendered (locale-client.ts).

export async function localeForRequest(request: Request): Promise<Locale | undefined> {
  const fromRequest = localeFromRequest(request);
  if (fromRequest) return fromRequest;
  try {
    const { workspaceSlugFromRequest } = await import("./session");
    return (await workspaceLocale(await workspaceSlugFromRequest(request))) ?? undefined;
  } catch {
    // No database, no migration yet, a workspace that no longer exists: the
    // base locale is a better answer than a failed page.
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
