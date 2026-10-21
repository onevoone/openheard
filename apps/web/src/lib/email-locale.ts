import { BASE_LOCALE, type Locale, isLocale } from "@openheard/i18n/locales";

// Emails are built outside the request (waitUntil, cron), so their language is
// the workspace's own, passed down explicitly and never read from getLocale().
export function emailLocale(ws: { locale: string }): Locale {
  return isLocale(ws.locale) ? ws.locale : BASE_LOCALE;
}
