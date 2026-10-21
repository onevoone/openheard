import { status } from "@openheard/db";
import type { Db } from "@openheard/db";
import { defaultStatuses } from "@openheard/db/defaults";
import type { STATUS_KINDS } from "@openheard/db/schema/feedback";
import type { Locale } from "@openheard/i18n/locales";
import { m } from "@openheard/i18n/messages";
import { and, asc, eq } from "drizzle-orm";

// Server-only helpers. Never import this from a route or component; it pulls
// the database into the bundle. Server functions import it inside handlers.
export type StatusRow = typeof status.$inferSelect;

export async function listStatuses(db: Db, workspaceId: string) {
  return db.select().from(status).where(eq(status.workspaceId, workspaceId)).orderBy(asc(status.position));
}

// The labels are written in `locale` once, here; the admin renames them later.
export async function seedStatuses(db: Db, workspaceId: string, locale: Locale) {
  await db
    .insert(status)
    .values(defaultStatuses(locale).map((d, i) => ({ workspaceId, ...d, position: i })))
    .onConflictDoNothing();
}

// The status a workspace uses for a given meaning, e.g. the first "done" one.
export async function statusOfKind(db: Db, workspaceId: string, kind: (typeof STATUS_KINDS)[number]) {
  const [row] = await db.select().from(status).where(and(eq(status.workspaceId, workspaceId), eq(status.kind, kind))).orderBy(asc(status.position)).limit(1);
  return row ?? null;
}

export async function assertStatus(db: Db, workspaceId: string, key: string) {
  const [row] = await db.select({ key: status.key }).from(status).where(and(eq(status.workspaceId, workspaceId), eq(status.key, key))).limit(1);
  if (!row) throw new Error(m.err_status_unknown());
}

