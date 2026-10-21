import { type Locale } from "@openheard/i18n/locales";
import { m } from "@openheard/i18n/messages";

import { type FormatOptions, formatDate, formatShortDate } from "./format";

type Input = Date | number | string;
type Unit = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";
// `now` is for tests.
type TimeOptions = FormatOptions & { now?: number };

const units: [number, Unit][] = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4.35, "week"],
  [12, "month"],
  [Infinity, "year"],
];

// How long ago, as a whole number of the largest unit that fits. Null when it
// is fresh enough to say "now".
function elapsed(date: Input, now = Date.now()): { count: number; unit: Unit } | null {
  let diff = (now - new Date(date).getTime()) / 1000;
  if (diff < 45) return null;
  for (const [size, unit] of units) {
    if (diff < size) return { count: Math.max(1, Math.round(diff)), unit };
    diff /= size;
  }
  return null;
}

// "2d", "3w", "2 дн.": short enough to sit in a meta row. Abbreviations do not
// inflect, so these messages have no plural forms.
export function ago(date: Input, { locale, now }: TimeOptions = {}): string {
  const e = elapsed(date, now);
  if (!e) return m.time_now({}, { locale });
  const o = { locale };
  const { count } = e;
  switch (e.unit) {
    case "second":
      return m.time_ago_second({ count }, o);
    case "minute":
      return m.time_ago_minute({ count }, o);
    case "hour":
      return m.time_ago_hour({ count }, o);
    case "day":
      return m.time_ago_day({ count }, o);
    case "week":
      return m.time_ago_week({ count }, o);
    case "month":
      return m.time_ago_month({ count }, o);
    case "year":
      return m.time_ago_year({ count }, o);
  }
}

// "3 days ago", or "just now" when it is fresh. For sentences, not meta rows.
export function since(date: Input, { locale, now }: TimeOptions = {}): string {
  const e = elapsed(date, now);
  if (!e) return m.time_just_now({}, { locale });
  const o = { locale };
  const { count } = e;
  switch (e.unit) {
    case "second":
      return m.time_since_second({ count }, o);
    case "minute":
      return m.time_since_minute({ count }, o);
    case "hour":
      return m.time_since_hour({ count }, o);
    case "day":
      return m.time_since_day({ count }, o);
    case "week":
      return m.time_since_week({ count }, o);
    case "month":
      return m.time_since_month({ count }, o);
    case "year":
      return m.time_since_year({ count }, o);
  }
}

export function longDate(date: Input, options?: { locale?: Locale }): string {
  return formatShortDate(date, options);
}

export function fullDate(date: Input, options?: { locale?: Locale }): string {
  return formatDate(date, options);
}
