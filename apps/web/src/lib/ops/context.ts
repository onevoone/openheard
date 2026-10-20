import type { Db } from "@openheard/db";
import type { Locale } from "@openheard/i18n/locales";
import { m } from "@openheard/i18n/messages";

import { purgeWorkspaceCache } from "@/lib/cache";
import { invalidate } from "@/lib/kv-cache";
import type { Workspace } from "@/lib/session";

// Admin operations shared by the dashboard's server functions, the HTTP API
// and the MCP server. Server-only: never import from a route or component.
//
// `actor` is the admin doing it. API keys made by the local script have no
// owner, so it can be null; anything that needs a person (votes, workspace
// creation) says so.
export type Actor = { id: string; name: string; email: string };
//
// `locale` is the language error messages are written in. A dashboard call
// passes the request's language; the HTTP API and MCP pass "en", because
// they are machine interfaces whose texts are part of the contract.
export type OpCtx = { db: Db; workspace: Workspace; actor: Actor | null; origin: string; locale: Locale };

// A refusal the caller can act on. `status` is what the HTTP API answers with.
export class OpError extends Error {
  status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.status = status;
  }
}

export function needActor(ctx: OpCtx, what: string): Actor {
  if (!ctx.actor) throw new OpError(`${what} needs a person behind the key. Create the key from Settings > API keys while signed in.`, 403);
  return ctx.actor;
}

// The shell data (boards, statuses, counts) and the public pages' edge copies.
export function refresh(ctx: OpCtx, postIds?: number[]) {
  void invalidate(`workspace:${ctx.workspace.id}`);
  void purgeWorkspaceCache(ctx.origin, postIds);
}

// "'a', 'b'" for error messages that list what does exist.
export function listOf(items: string[], locale: Locale): string {
  if (!items.length) return m.list_none({}, { locale });
  return items.map((s) => `'${s}'`).join(", ");
}
