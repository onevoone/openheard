import { LOCALES, LOCALE_NAMES } from "@openheard/i18n/locales";
import { m } from "@openheard/i18n/messages";
import { getLocale, setLocale } from "@openheard/i18n/runtime";
import { cn } from "@openheard/ui/lib/utils";

// The visitor's own pick, kept in a cookie. It outranks the board's language
// and their browser's, and reloads the page so the server renders it.
export function LanguageSwitch({ className }: { className?: string }) {
  const current = getLocale();
  return (
    <span role="group" aria-label={m.lang_switch_label()} className={cn("inline-flex items-center gap-1", className)}>
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-pressed={locale === current}
          onClick={() => locale !== current && setLocale(locale)}
          className={cn(
            "rounded px-1.5 py-0.5 transition-colors",
            locale === current ? "font-semibold text-muted-foreground" : "text-faint hover:text-muted-foreground",
          )}
        >
          {LOCALE_NAMES[locale]}
        </button>
      ))}
    </span>
  );
}
