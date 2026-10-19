import { isLocale } from "@openheard/i18n/locales";
import { defineCustomClientStrategy, overwriteSetLocale, setLocale } from "@openheard/i18n/runtime";

// The server picked the language and wrote it on <html lang>; the browser must
// agree with it or hydration renders different text. Nothing to write back:
// the cookie belongs to the language switcher.
export function registerClientLocaleStrategy() {
  if (typeof document === "undefined") return;
  defineCustomClientStrategy("custom-htmlLang", {
    getLocale: () => {
      const lang = document.documentElement.lang;
      return isLocale(lang) ? lang : undefined;
    },
    setLocale: () => {},
  });
  // Paraglide calls setLocale(resolved, { reload: false }) the first time
  // getLocale resolves, which would store whatever the server chose as the
  // visitor's own pick and pin them to it when the board's language changes.
  // Only an explicit switch, which reloads, may write the cookie.
  const original = setLocale;
  overwriteSetLocale((locale, options) => (options?.reload === false ? undefined : original(locale, options)));
}
