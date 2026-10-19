import { beforeEach, describe, expect, it, vi } from "vitest";

const select = vi.fn();
vi.mock("@openheard/db", () => ({
  createDb: () => ({ select: () => ({ from: () => ({ where: () => ({ limit: select }) }) }) }),
  workspace: { locale: "locale", id: "id" },
}));

const { forgetWorkspaceLocale, workspaceLocale } = await import("./workspace-locale");

beforeEach(() => {
  select.mockReset();
  for (const slug of ["acme", "ghost"]) forgetWorkspaceLocale(slug);
});

describe("workspaceLocale", () => {
  it("reads the workspace's language once per TTL window", async () => {
    select.mockResolvedValue([{ locale: "en" }]);
    expect(await workspaceLocale("acme", 1_000)).toBe("en");
    expect(await workspaceLocale("acme", 20_000)).toBe("en");
    expect(select).toHaveBeenCalledTimes(1);
    expect(await workspaceLocale("acme", 40_000)).toBe("en");
    expect(select).toHaveBeenCalledTimes(2);
  });

  it("picks up a saved change straight away once forgotten", async () => {
    select.mockResolvedValueOnce([{ locale: "en" }]).mockResolvedValueOnce([{ locale: "uk" }]);
    expect(await workspaceLocale("acme", 1_000)).toBe("en");
    forgetWorkspaceLocale("acme");
    expect(await workspaceLocale("acme", 2_000)).toBe("uk");
  });

  it("says nothing for an unknown workspace or a language we do not ship, and remembers that too", async () => {
    select.mockResolvedValue([]);
    expect(await workspaceLocale("ghost", 1_000)).toBeNull();
    expect(await workspaceLocale("ghost", 2_000)).toBeNull();
    expect(select).toHaveBeenCalledTimes(1);
    select.mockResolvedValue([{ locale: "fr" }]);
    expect(await workspaceLocale("acme", 3_000)).toBeNull();
  });
});
