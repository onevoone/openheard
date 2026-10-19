import { type Locale, isLocale } from "@openheard/i18n/locales";
import { eq } from "drizzle-orm";

// The language an admin chose for a workspace's board, read on nearly every
// request, so remembered for a short while. Server-only.

const TTL_MS = 30_000;
const MAX_ENTRIES = 500;

// Per isolate. A subdomain nobody owns is cached too (as null), and strangers
// choose subdomains, so the map is bounded.
const workspaceLocales = new Map<string, { locale: Locale | null; until: number }>();

async function readWorkspaceLocale(slug: string): Promise<Locale | null> {
  const { createDb, workspace } = await import("@openheard/db");
  const [row] = await createDb().select({ locale: workspace.locale }).from(workspace).where(eq(workspace.id, slug)).limit(1);
  return isLocale(row?.locale) ? row.locale : null;
}

export async function workspaceLocale(slug: string, now = Date.now()): Promise<Locale | null> {
  const hit = workspaceLocales.get(slug);
  if (hit && hit.until > now) return hit.locale;
  const locale = await readWorkspaceLocale(slug);
  if (workspaceLocales.size >= MAX_ENTRIES) workspaceLocales.clear();
  workspaceLocales.set(slug, { locale, until: now + TTL_MS });
  return locale;
}

// Called when an admin saves the board language. Other isolates catch up
// within the TTL.
export function forgetWorkspaceLocale(slug: string) {
  workspaceLocales.delete(slug);
}
