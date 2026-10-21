// The two things session.ts words or seeds from the request's language: the
// refusals of requireUser/requireAdmin, and the `default` workspace a
// self-hosted install creates the first time anyone opens it.
import { createClient } from "@libsql/client";
import type { Db } from "@openheard/db";
import * as schema from "@openheard/db/schema/index";
import { type Locale } from "@openheard/i18n/locales";
import { overwriteGetLocale } from "@openheard/i18n/runtime";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { readFileSync, readdirSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ db: null as unknown as Db }));

vi.mock("@openheard/env/server", () => ({ env: {} }));
vi.mock("@openheard/db", async () => ({ ...(await import("@openheard/db/schema/index")), createDb: () => h.db }));
vi.mock("@openheard/auth", () => ({ createAuth: () => ({}), sessionForRequest: async () => null }));

import { requireAdmin, requireUser, getSessionContext } from "./session";

const MIGRATIONS = new URL("../../../../packages/db/migrations/", import.meta.url).pathname;

// Tests run outside a request, so the language is whatever we say it is.
let language: Locale = "uk";

beforeEach(async () => {
  overwriteGetLocale(() => language);
  const client = createClient({ url: ":memory:" });
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    await client.executeMultiple(readFileSync(MIGRATIONS + file, "utf8").replaceAll("--> statement-breakpoint", ""));
  }
  h.db = drizzle(client, { schema }) as unknown as Db;
});

afterEach(() => {
  language = "uk";
});

describe("requireUser and requireAdmin", () => {
  it("refuse in the language of the request", () => {
    language = "en";
    expect(() => requireUser(null)).toThrow("Sign in to do that");
    expect(() => requireAdmin({ id: "u", name: "U", email: "u@x.test", role: "member" })).toThrow("Admins only");
    language = "uk";
    expect(() => requireUser(null)).toThrow("Увійдіть, щоб це зробити");
    expect(() => requireAdmin({ id: "u", name: "U", email: "u@x.test", role: "member" })).toThrow("Лише для адміністраторів");
  });
});

describe("the default workspace of a self-hosted install", () => {
  const open = () => getSessionContext(new Request("https://board.example.com/", { headers: { host: "board.example.com" } }));

  it.each([
    ["uk", "Очікує", /^Голосуйте/],
    ["en", "Pending", /^Vote on what matters/],
  ] as const)("is created in %s for whoever opens it first", async (locale, firstStatus, tagline) => {
    language = locale;
    const { workspace } = await open();
    expect(workspace.locale).toBe(locale);
    expect(workspace.tagline).toMatch(tagline);
    const statuses = await h.db.select().from(schema.status).where(eq(schema.status.workspaceId, "default")).orderBy(asc(schema.status.position));
    expect(statuses).toHaveLength(6);
    expect(statuses[0]!.label).toBe(firstStatus);
  });

  it("is not rewritten when someone with another language opens it later", async () => {
    language = "uk";
    await open();
    language = "en";
    const { workspace } = await open();
    expect(workspace.locale).toBe("uk");
  });
});
