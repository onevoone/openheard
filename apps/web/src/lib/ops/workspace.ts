import { board, membership, workspace } from "@openheard/db";
import type { Db } from "@openheard/db";
import { defaultBoard, defaultTagline } from "@openheard/db/defaults";
import { invite } from "@openheard/db/schema/feedback";
import { user } from "@openheard/db/schema/auth";
import type { Locale } from "@openheard/i18n/locales";
import { m } from "@openheard/i18n/messages";
import { and, count, eq, isNull, ne } from "drizzle-orm";

import { forgetWorkspaceLocale } from "@/lib/workspace-locale";
import { assertNotDemo, assertNotDemoIdentity, isDemo } from "@/lib/demo";
import { PLANS } from "@/lib/plans";
import { seedStatuses } from "@/lib/status-db";
import { MAX_EMBED_ORIGINS, parseEmbedOrigins } from "@/lib/widget-origins";
import { type WidgetSettings, readWidgetSettings, widgetSettingsSchemaFor } from "@/lib/widget-settings";

import { type Actor, type OpCtx, OpError, refresh } from "./context";

// ---- workspaces ----

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

export const RESERVED_SLUGS = ["default", "www", "app", "api", "admin", "mail", "demo"];

export async function workspacesOf(db: Db, userId: string) {
  return db
    .select({ id: workspace.id, name: workspace.name, role: membership.role, website: workspace.website })
    .from(membership)
    .innerJoin(workspace, eq(workspace.id, membership.workspaceId))
    .where(eq(membership.userId, userId))
    .orderBy(membership.createdAt);
}

// On the cloud every signup is a member, so the one account holding the
// global admin role runs the instance and is never held to a plan. A
// self-hosted install keeps the plan limits it always had.
async function isPlatformOwner(role: string | undefined): Promise<boolean> {
  if (role !== "admin") return false;
  const { env } = await import("@openheard/env/server");
  return !!(env as unknown as { ROOT_DOMAIN?: string }).ROOT_DOMAIN;
}

// A new workspace with the default statuses and one board, owned by `owner`.
// With a website it starts in that site's colours and logo.
//
// `locale` is the language of the new workspace: its status labels, board and
// tagline are written in it, it becomes the board language, and errors are
// worded in it. The dashboard passes the request's language. The default is
// English for callers with no visitor behind them (the MCP server).
export async function createWorkspace(
  db: Db,
  owner: Actor,
  data: { name: string; slug?: string; website?: string | null; heardAboutUs?: string | null; whoCanPost?: "anyone" | "members" },
  { locale = "en" }: { locale?: Locale } = {},
) {
  // The shared demo login must never own anything outside the demo.
  assertNotDemoIdentity(owner, locale);
  const name = data.name.trim();
  if (name.length < 2 || name.length > 60) throw new OpError(m.err_name_length({ min: 2, max: 60 }, { locale }));
  const [{ n: owned }] = await db.select({ n: count() }).from(membership).where(and(eq(membership.userId, owner.id), eq(membership.role, "admin"), ne(membership.workspaceId, "default")));
  const [acct] = await db.select({ plan: user.plan, role: user.role }).from(user).where(eq(user.id, owner.id)).limit(1);
  const limit = PLANS[acct?.plan ?? "free"].workspaces;
  if (owned >= limit && !(await isPlatformOwner(acct?.role))) throw new OpError(acct?.plan === "pro" ? m.err_plan_limit_pro({ count: limit }, { locale }) : m.err_plan_limit_free({ limit, pro: PLANS.pro.workspaces }, { locale }), 403);
  const id = slugify(data.slug || name);
  // checkSlug applies the same floor; the mutation cannot rely on it.
  if (!id || id.length < 5 || RESERVED_SLUGS.includes(id)) throw new OpError(m.err_slug_invalid({}, { locale }));
  const [taken] = await db.select({ id: workspace.id }).from(workspace).where(eq(workspace.id, id)).limit(1);
  if (taken) throw new OpError(m.err_slug_taken({ slug: id }, { locale }));
  const website = data.website?.trim() || null;
  await db.insert(workspace).values({ id, name, tagline: defaultTagline(locale), locale, website, heardAboutUs: data.heardAboutUs || null, ...(data.whoCanPost ? { whoCanPost: data.whoCanPost } : {}) });
  await db.insert(membership).values({ workspaceId: id, userId: owner.id, role: "admin" });
  await seedStatuses(db, id, locale);
  await db.insert(board).values({ id: `${id}-features`, workspaceId: id, ...defaultBoard(locale), position: 0 });
  if (website) {
    const { prefillBrand } = await import("@/lib/brand-match");
    await prefillBrand(id, website, { db });
  }
  return { id };
}

export type WorkspacePatch = Partial<{
  name: string;
  tagline: string;
  theme: "dark" | "light";
  locale: Locale;
  poweredBy: boolean;
  requireApproval: boolean;
  accent: string | null;
  whoCanPost: "anyone" | "members";
  anonymousVoting: boolean;
  showRoadmap: boolean;
  showChangelog: boolean;
  statusEmails: boolean;
  website: string | null;
  heardAboutUs: string | null;
}>;

export async function updateWorkspace(ctx: OpCtx, patch: WorkspacePatch) {
  // Branding is fair game in the demo; the settings that decide whether a
  // visitor can post or vote are what make it a demo at all.
  if (isDemo(ctx.workspace)) {
    for (const key of ["whoCanPost", "anonymousVoting", "requireApproval"] as const) {
      if (patch[key] !== undefined && patch[key] !== ctx.workspace[key]) throw new OpError(m.err_demo_access_locked({}, { locale: ctx.locale }), 403);
    }
  }
  if (patch.accent) patch.accent = patch.accent.toLowerCase();
  const set = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  if (Object.keys(set).length) {
    await ctx.db.update(workspace).set(set).where(eq(workspace.id, ctx.workspace.id));
    Object.assign(ctx.workspace, set);
    // The language of every page is resolved from this row, remembered for a
    // few seconds per isolate.
    if (set.locale !== undefined) forgetWorkspaceLocale(ctx.workspace.id);
    refresh(ctx);
  }
  return { updated: Object.keys(set) };
}

// ---- branding ----

// Each match fetches up to a handful of files from someone else's server, so
// an account gets a few a minute and a few dozen an hour.
export async function assertMatchAllowed(who: string, locale: Locale) {
  const { rateLimit } = await import("@/lib/rate-limit");
  const minute = await rateLimit(`brand-match:m:${who}`, { window: 60, max: 5, failClosed: true });
  const hour = minute.allowed ? await rateLimit(`brand-match:h:${who}`, { window: 3600, max: 30, failClosed: true }) : minute;
  if (!hour.allowed) throw new OpError(m.err_too_many_matches({}, { locale }), 429);
}

const matcher = (ctx: OpCtx) => ctx.actor?.id ?? `ws:${ctx.workspace.id}`;

export async function matchBrand(ctx: OpCtx, url: string) {
  await assertMatchAllowed(matcher(ctx), ctx.locale);
  const [{ matchWebsite }, { BlockedUrlError }] = await Promise.all([import("@/lib/brand-match"), import("@/lib/safe-fetch")]);
  try {
    return await matchWebsite(url);
  } catch (err) {
    if (err instanceof BlockedUrlError) throw new OpError(err.localized(ctx.locale));
    throw new OpError(m.err_site_unreadable({}, { locale: ctx.locale }));
  }
}

// Applies the parts of a match the admin kept. The logo is fetched again
// from its source and copied into our storage; nothing is hotlinked.
export async function applyBrand(ctx: OpCtx, data: { name?: string; accent?: string; theme?: "dark" | "light"; logoSrc?: string; removeLogo?: boolean }) {
  const ws = ctx.workspace;
  const set: Partial<typeof workspace.$inferInsert> = {};
  if (data.name?.trim()) set.name = data.name.trim();
  if (data.accent) set.accent = data.accent.toLowerCase();
  if (data.theme) set.theme = data.theme;
  if (data.removeLogo) set.logoUrl = null;
  let logoSkipped = false;
  if (data.logoSrc) {
    if (isDemo(ws)) logoSkipped = true;
    else {
      await assertMatchAllowed(matcher(ctx), ctx.locale);
      const { storeLogo } = await import("@/lib/brand-match");
      const path = await storeLogo(ws.id, data.logoSrc);
      if (path) set.logoUrl = path;
      else logoSkipped = true;
    }
  }
  if (Object.keys(set).length) {
    await ctx.db.update(workspace).set(set).where(eq(workspace.id, ws.id));
    Object.assign(ctx.workspace, set);
    refresh(ctx);
  }
  return { ok: true, applied: Object.keys(set), logoSkipped };
}

// ---- widget ----

export async function saveWidgetSettings(ctx: OpCtx, settings: WidgetSettings) {
  // The demo's widget has to keep working for everyone who tries it.
  assertNotDemo(ctx.workspace, ctx.locale);
  const data = widgetSettingsSchemaFor(ctx.locale).parse(settings);
  await ctx.db.update(workspace).set({ widgetSettings: data }).where(eq(workspace.id, ctx.workspace.id));
  ctx.workspace.widgetSettings = data;
  refresh(ctx);
  return data;
}

// Settings with only the given fields changed, checked as a whole.
// Only the MCP server merges (the dashboard saves whole objects), so the
// messages default to English.
export function mergeWidgetSettings(stored: unknown, patch: Partial<Record<keyof WidgetSettings, unknown>>, locale: Locale = "en") {
  const merged = { ...readWidgetSettings(stored), ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) };
  const parsed = widgetSettingsSchemaFor(locale).safeParse(merged);
  if (!parsed.success) throw new OpError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  return parsed.data;
}

export async function saveWidgetOrigins(ctx: OpCtx, input: string) {
  assertNotDemo(ctx.workspace, ctx.locale);
  const { origins, invalid } = parseEmbedOrigins(input);
  if (invalid.length) throw new OpError(m.err_origin_invalid({ origin: invalid[0] }, { locale: ctx.locale }));
  if (origins.length > MAX_EMBED_ORIGINS) throw new OpError(m.err_origins_max({ count: MAX_EMBED_ORIGINS }, { locale: ctx.locale }));
  const value = origins.length ? origins.join(" ") : null;
  await ctx.db.update(workspace).set({ widgetOrigins: value }).where(eq(workspace.id, ctx.workspace.id));
  ctx.workspace.widgetOrigins = value;
  refresh(ctx);
  return { origins };
}

// ---- team ----

export async function listMembers(ctx: OpCtx) {
  // Member emails are not demo content.
  assertNotDemo(ctx.workspace, ctx.locale);
  const [members, invites] = await Promise.all([
    ctx.db
      .select({ id: user.id, name: user.name, email: user.email, image: user.image, role: membership.role, createdAt: membership.createdAt })
      .from(membership)
      .innerJoin(user, eq(user.id, membership.userId))
      .where(eq(membership.workspaceId, ctx.workspace.id))
      .orderBy(membership.createdAt),
    ctx.db
      .select({ email: invite.email, role: invite.role, expiresAt: invite.expiresAt })
      .from(invite)
      .where(and(eq(invite.workspaceId, ctx.workspace.id), isNull(invite.acceptedAt))),
  ]);
  return { members, pendingInvites: invites };
}

export async function createInvite(ctx: OpCtx, data: { email: string; role: "admin" | "member" }) {
  assertNotDemo(ctx.workspace, ctx.locale);
  const email = data.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new OpError(m.err_email_invalid({ email: data.email }, { locale: ctx.locale }));
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await ctx.db.insert(invite).values({ workspaceId: ctx.workspace.id, email, role: data.role, token, expiresAt });
  const [{ env }, { sendInviteEmail }] = await Promise.all([import("@openheard/env/server"), import("@/lib/email")]);
  const baseUrl = env.BETTER_AUTH_URL || "http://localhost:3001";
  await sendInviteEmail(email, ctx.actor?.name ?? ctx.workspace.name, ctx.workspace.name, `${baseUrl}/join/${token}`);
  return { invited: email, role: data.role, expiresAt };
}
