import type { Locale } from "@openheard/i18n/locales";
import { getLocale } from "@openheard/i18n/runtime";

// Numbers and dates in the reader's language. The message locale is `uk` or
// `en`; Intl wants a region too, so `uk` formats as Ukrainian in Ukraine.
// Pure helpers take an optional `{ locale }` for callers outside a request
// (emails go to the workspace's language, not the sender's).
export type FormatOptions = { locale?: Locale };

const BCP47: Record<Locale, string> = { uk: "uk-UA", en: "en-US" };

export function intlLocale(locale?: Locale): string {
  return BCP47[locale ?? getLocale()];
}

type Input = Date | number | string;

export function formatNumber(n: number, { locale, ...options }: FormatOptions & Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(intlLocale(locale), options).format(n);
}

// "Mar 5" / "5 бер."
export function formatShortDate(date: Input, { locale }: FormatOptions = {}): string {
  return new Date(date).toLocaleDateString(intlLocale(locale), { month: "short", day: "numeric" });
}

// "Mar 5, 2026" / "5 бер. 2026 р."
export function formatDate(date: Input, { locale }: FormatOptions = {}): string {
  return new Date(date).toLocaleDateString(intlLocale(locale), { month: "short", day: "numeric", year: "numeric" });
}
