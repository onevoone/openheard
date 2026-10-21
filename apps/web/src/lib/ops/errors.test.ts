// What an op says when it refuses: in the language of the call (`ctx.locale`),
// never in the language of whoever is asking. The dashboard passes the request's
// language and the HTTP API and MCP pass "en".
import { createClient } from "@libsql/client";
import type { Db } from "@openheard/db";
import * as schema from "@openheard/db/schema/index";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { readFileSync, readdirSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@openheard/env/server", () => ({ env: { BETTER_AUTH_SECRET: "test-secret-not-a-real-one-32chars", ROOT_DOMAIN: "localhost" } }));
vi.mock("@openheard/db", async () => ({ ...(await import("@openheard/db/schema/index")), createDb: () => db }));

import type { OpCtx } from "./context";
import { OpError } from "./context";
import { resolveStatus } from "./posts";
import { deleteBoard, saveStatus } from "./setup";
import { createWorkspace } from "./workspace";

const MIGRATIONS = new URL("../../../../../packages/db/migrations/", import.meta.url).pathname;

let db: Db;

const ann = { id: "ann", name: "Ann", email: "ann@example.com" };
const ctx = (locale: OpCtx["locale"]): OpCtx => ({ db, workspace: { id: "acme", name: "Acme" } as OpCtx["workspace"], actor: ann, origin: "http://localhost:3000", locale });

async function messageOf(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (err) {
    expect(err).toBeInstanceOf(OpError);
    return (err as OpError).message;
  }
  throw new Error("expected a refusal");
}

beforeEach(async () => {
  const client = createClient({ url: ":memory:" });
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    await client.executeMultiple(readFileSync(MIGRATIONS + file, "utf8").replaceAll("--> statement-breakpoint", ""));
  }
  db = drizzle(client, { schema }) as unknown as Db;
  await db.insert(schema.user).values({ ...ann, emailVerified: true });
  await db.insert(schema.workspace).values({ id: "acme", name: "Acme" });
  await db.insert(schema.status).values([{ workspaceId: "acme", key: "open", label: "Pending", color: "#f2b53d", kind: "open", onRoadmap: false, position: 0 }]);
  await db.insert(schema.board).values({ id: "acme-features", workspaceId: "acme", name: "Features" });
});

describe("refusals follow ctx.locale", () => {
  it("names what is missing and lists what exists", async () => {
    expect(await messageOf(() => resolveStatus(ctx("en"), "nope"))).toBe("Status 'nope' not found; statuses are: 'open'");
    expect(await messageOf(() => resolveStatus(ctx("uk"), "nope"))).toBe("Статус «nope» не знайдено. Наявні статуси: 'open'");
  });

  it("fills in the limits", async () => {
    const long = { label: "x".repeat(31), color: "#6e8bff", kind: "open" as const, onRoadmap: false };
    expect(await messageOf(() => saveStatus(ctx("en"), long))).toBe("Status label must be 1 to 30 characters");
    expect(await messageOf(() => saveStatus(ctx("uk"), long))).toBe("Підпис статусу має містити від 1 до 30 символів");
  });

  // 1, 21 -> one; 2, 22 -> few; 5, 11 -> many.
  it.each([
    [1, "У цій дошці 1 ідея. Перенесіть або видаліть її.", "This board has 1 post. Move or delete it first."],
    [2, "У цій дошці 2 ідеї. Перенесіть або видаліть їх.", "This board has 2 posts. Move or delete them first."],
    [5, "У цій дошці 5 ідей. Перенесіть або видаліть їх.", "This board has 5 posts. Move or delete them first."],
    [11, "У цій дошці 11 ідей. Перенесіть або видаліть їх.", "This board has 11 posts. Move or delete them first."],
    [21, "У цій дошці 21 ідея. Перенесіть або видаліть її.", "This board has 21 posts. Move or delete them first."],
    [22, "У цій дошці 22 ідеї. Перенесіть або видаліть їх.", "This board has 22 posts. Move or delete them first."],
  ])("counts %i posts on a board", async (n, uk, en) => {
    await db.insert(schema.post).values(Array.from({ length: n }, (_, i) => ({ id: i + 1, workspaceId: "acme", boardId: "acme-features", title: `Post ${i}` })));
    expect(await messageOf(() => deleteBoard(ctx("uk"), "acme-features"))).toBe(uk);
    expect(await messageOf(() => deleteBoard(ctx("en"), "acme-features"))).toBe(en);
  });
});

describe("a new workspace starts in its own language", () => {
  const rows = async (id: string) => ({
    ws: (await db.select().from(schema.workspace).where(eq(schema.workspace.id, id)))[0]!,
    statuses: (await db.select().from(schema.status).where(eq(schema.status.workspaceId, id)).orderBy(schema.status.position)).map((s) => s.label),
    board: (await db.select().from(schema.board).where(eq(schema.board.workspaceId, id)))[0]!,
  });

  it("writes Ukrainian labels, board and tagline for uk", async () => {
    await createWorkspace(db, ann, { name: "Нова дошка", slug: "novadoshka" }, { locale: "uk" });
    const { ws, statuses, board } = await rows("novadoshka");
    expect(ws.locale).toBe("uk");
    expect(ws.tagline).toMatch(/^Голосуйте/);
    expect(statuses).toEqual(["Очікує", "На розгляді", "Заплановано", "У роботі", "Випущено", "Закрито"]);
    expect(board.name).toBe("Ідеї");
  });

  it("writes the English set for en, and for callers that name no language", async () => {
    await createWorkspace(db, ann, { name: "New board", slug: "newboard" }, { locale: "en" });
    const en = await rows("newboard");
    expect(en.ws.locale).toBe("en");
    expect(en.ws.tagline).toMatch(/^Vote on what matters/);
    expect(en.statuses).toEqual(["Pending", "Under review", "Planned", "In progress", "Shipped", "Closed"]);
    expect(en.board.name).toBe("Feature requests");

    await createWorkspace(db, ann, { name: "Plain call", slug: "plaincall" });
    expect((await rows("plaincall")).ws.locale).toBe("en");
  });

  it("refuses in the same language the workspace would have", async () => {
    await expect(createWorkspace(db, ann, { name: "x" }, { locale: "uk" })).rejects.toThrow("Назва має містити від 2 до 60 символів");
    await expect(createWorkspace(db, ann, { name: "x" })).rejects.toThrow("Name must be 2 to 60 characters");
  });
});
