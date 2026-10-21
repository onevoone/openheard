import { BASE_LOCALE, LOCALES, LOCALE_NAMES, isLocale } from "@openheard/i18n/locales";
import { m } from "@openheard/i18n/messages";
import { LoadingButton } from "@openheard/ui/components/interior/loading-button";
import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Row, SectionHead } from "@/components/admin/panel";
import { saveWorkspace } from "@/functions/settings";
import { PageHead } from "@/routes/dashboard/settings";

export const Route = createFileRoute("/dashboard/settings/general")({
  head: () => ({ meta: [{ title: m.settings_general_meta() }] }),
  component: General,
});

const input = "h-8 w-[280px] rounded-lg border border-input bg-card px-2.5 text-[13px] outline-none placeholder:text-faint focus:border-ring/60";

function General() {
  const root = useLoaderData({ from: "__root__" });
  const router = useRouter();
  const ws = root.workspace;
  const [name, setName] = useState(ws.name);
  const [tagline, setTagline] = useState(ws.tagline);
  const savedLocale = isLocale(ws.locale) ? ws.locale : BASE_LOCALE;
  const [locale, setLocale] = useState(savedLocale);
  const dirty = name !== ws.name || tagline !== ws.tagline || locale !== savedLocale;

  function save() {
    saveWorkspace({ data: { name, tagline, theme: ws.theme === "light" ? "light" : "dark", poweredBy: ws.poweredBy, requireApproval: ws.requireApproval, accent: ws.accent, locale } })
      .then(() => router.invalidate())
      .catch((err) => toast.error(err instanceof Error ? err.message : m.settings_save_failed()));
  }

  return (
    <>
      <PageHead title={m.settings_general_title()} sub={m.settings_general_sub()} />
      <SectionHead title={m.settings_general_section()} />
      <Row label={m.settings_general_name_label()} help={m.settings_general_name_help()}>
        <input value={name} onChange={(e) => setName(e.target.value)} aria-label={m.settings_general_name_aria()} className={input} />
      </Row>
      <Row label={m.settings_general_tagline_label()} help={m.settings_general_tagline_help()}>
        <input value={tagline} onChange={(e) => setTagline(e.target.value)} aria-label={m.settings_general_tagline_label()} className={input} />
      </Row>
      <Row label={m.settings_board_language_label()} help={m.settings_board_language_help()}>
        <select value={locale} onChange={(e) => isLocale(e.target.value) && setLocale(e.target.value)} aria-label={m.settings_board_language_label()} className={input}>
          {LOCALES.map((l) => (
            <option key={l} value={l} lang={l}>
              {LOCALE_NAMES[l]}
            </option>
          ))}
        </select>
      </Row>
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <span className="text-xs text-faint">{dirty ? m.settings_unsaved() : m.settings_saved()}</span>
        <LoadingButton onAction={save} disabled={!dirty} successLabel={m.settings_saved()} onError={(err) => toast.error(err instanceof Error ? err.message : m.settings_save_failed())}>
          {m.settings_save()}
        </LoadingButton>
      </div>
    </>
  );
}
