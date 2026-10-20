import { describe, expect, it } from "vitest";

import { ago, fullDate, longDate, since } from "./time";

const NOW = Date.UTC(2026, 5, 15, 12);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const at = (ms: number) => NOW - ms;

describe("ago", () => {
  it("says now for anything under 45 seconds", () => {
    expect(ago(at(0), { locale: "en", now: NOW })).toBe("now");
    expect(ago(at(44_000), { locale: "en", now: NOW })).toBe("now");
    expect(ago(at(44_000), { locale: "uk", now: NOW })).toBe("зараз");
  });

  it("is compact in English", () => {
    const o = { locale: "en", now: NOW } as const;
    expect(ago(at(5 * MIN), o)).toBe("5m");
    expect(ago(at(3 * HOUR), o)).toBe("3h");
    expect(ago(at(2 * DAY), o)).toBe("2d");
    expect(ago(at(21 * DAY), o)).toBe("3w");
    expect(ago(at(90 * DAY), o)).toBe("3mo");
    expect(ago(at(800 * DAY), o)).toBe("2y");
  });

  it("is compact in Ukrainian", () => {
    const o = { locale: "uk", now: NOW } as const;
    expect(ago(at(5 * MIN), o)).toBe("5 хв");
    expect(ago(at(3 * HOUR), o)).toBe("3 год");
    expect(ago(at(2 * DAY), o)).toBe("2 дн.");
    expect(ago(at(21 * DAY), o)).toBe("3 тиж.");
    expect(ago(at(90 * DAY), o)).toBe("3 міс.");
    expect(ago(at(800 * DAY), o)).toBe("2 р.");
  });

  it("takes a string or a number as well as a Date", () => {
    const o = { locale: "en", now: NOW } as const;
    expect(ago(new Date(at(2 * DAY)).toISOString(), o)).toBe("2d");
    expect(ago(at(2 * DAY), o)).toBe("2d");
  });
});

describe("since", () => {
  it("says just now when fresh", () => {
    expect(since(at(10_000), { locale: "en", now: NOW })).toBe("just now");
    expect(since(at(10_000), { locale: "uk", now: NOW })).toBe("щойно");
  });

  it("uses one/other in English", () => {
    const o = { locale: "en", now: NOW } as const;
    expect(since(at(MIN), o)).toBe("1 minute ago");
    expect(since(at(2 * MIN), o)).toBe("2 minutes ago");
    expect(since(at(HOUR), o)).toBe("1 hour ago");
    expect(since(at(DAY), o)).toBe("1 day ago");
    expect(since(at(7 * DAY), o)).toBe("1 week ago");
    expect(since(at(21 * DAY), o)).toBe("3 weeks ago");
  });

  // Ukrainian: 1, 21 -> one; 2-4, 22 -> few; 0, 5-20, 25 -> many.
  it.each([
    [1, "1 хвилину тому"],
    [2, "2 хвилини тому"],
    [4, "4 хвилини тому"],
    [5, "5 хвилин тому"],
    [11, "11 хвилин тому"],
    [12, "12 хвилин тому"],
    [21, "21 хвилину тому"],
    [22, "22 хвилини тому"],
    [25, "25 хвилин тому"],
  ])("inflects %i minutes in Ukrainian", (n, text) => {
    expect(since(at(n * MIN), { locale: "uk", now: NOW })).toBe(text);
  });

  it("inflects days, hours, weeks, months and years in Ukrainian", () => {
    const o = { locale: "uk", now: NOW } as const;
    expect(since(at(2 * HOUR), o)).toBe("2 години тому");
    expect(since(at(5 * HOUR), o)).toBe("5 годин тому");
    expect(since(at(21 * HOUR), o)).toBe("21 годину тому");
    expect(since(at(DAY), o)).toBe("1 день тому");
    expect(since(at(2 * DAY), o)).toBe("2 дні тому");
    expect(since(at(5 * DAY), o)).toBe("5 днів тому");
    expect(since(at(7 * DAY), o)).toBe("1 тиждень тому");
    expect(since(at(21 * DAY), o)).toBe("3 тижні тому");
    expect(since(at(90 * DAY), o)).toBe("3 місяці тому");
    expect(since(at(400 * DAY), o)).toBe("1 рік тому");
    expect(since(at(800 * DAY), o)).toBe("2 роки тому");
    expect(since(at(2000 * DAY), o)).toBe("5 років тому");
  });
});

describe("longDate and fullDate", () => {
  const d = new Date(2026, 2, 5, 12);
  it("follow the locale", () => {
    expect(longDate(d, { locale: "en" })).toBe("Mar 5");
    expect(fullDate(d, { locale: "en" })).toBe("Mar 5, 2026");
    expect(longDate(d, { locale: "uk" })).toBe("5 бер.");
  });
});
