import { describe, expect, it } from "vitest";

import { formatDate, formatNumber, formatShortDate, intlLocale } from "./format";

const D = new Date(2026, 2, 5, 12);

describe("format", () => {
  it("maps the message locales to Intl tags", () => {
    expect(intlLocale("uk")).toBe("uk-UA");
    expect(intlLocale("en")).toBe("en-US");
  });

  it("follows the base locale when none is given", () => {
    expect(formatNumber(1234567)).toBe(formatNumber(1234567, { locale: "uk" }));
  });

  it("groups numbers per locale", () => {
    expect(formatNumber(1234567, { locale: "en" })).toBe("1,234,567");
    // Ukrainian groups with a no-break space and puts the comma before decimals.
    expect(formatNumber(1234567, { locale: "uk" }).replace(/\s/g, " ")).toBe("1 234 567");
    expect(formatNumber(1.5, { locale: "uk", minimumFractionDigits: 1 })).toBe("1,5");
  });

  it("writes short and full dates per locale", () => {
    expect(formatShortDate(D, { locale: "en" })).toBe("Mar 5");
    expect(formatDate(D, { locale: "en" })).toBe("Mar 5, 2026");
    expect(formatShortDate(D, { locale: "uk" })).toBe("5 бер.");
    expect(formatDate(D, { locale: "uk" })).toMatch(/^5 бер\. 2026/);
  });
});
