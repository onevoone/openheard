import { m } from "@openheard/i18n/messages";
import { LoadingButton } from "@openheard/ui/components/interior/loading-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@openheard/ui/components/dropdown-menu";
import { CaretDownIcon } from "@phosphor-icons/react";
import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Row, SectionHead, Toggle } from "@/components/admin/panel";
import { saveWorkspace } from "@/functions/settings";
import { PageHead } from "@/routes/dashboard/settings";

export const Route = createFileRoute("/dashboard/settings/access")({
  head: () => ({ meta: [{ title: m.settings_access_meta() }] }),
  component: Access,
});

function Access() {
  const root = useLoaderData({ from: "__root__" });
  const router = useRouter();
  const ws = root.workspace;
  const [form, setForm] = useState({ whoCanPost: ws.whoCanPost, anonymousVoting: ws.anonymousVoting, requireApproval: ws.requireApproval, showRoadmap: ws.showRoadmap, showChangelog: ws.showChangelog });
  const dirty = Object.entries(form).some(([k, v]) => (ws as Record<string, unknown>)[k] !== v);

  function save() {
    saveWorkspace({ data: { name: ws.name, tagline: ws.tagline, theme: ws.theme === "light" ? "light" : "dark", poweredBy: ws.poweredBy, accent: ws.accent, ...form } })
      .then(() => router.invalidate())
      .catch((err) => toast.error(err instanceof Error ? err.message : m.settings_save_failed()));
  }

  return (
    <>
      <PageHead title={m.settings_access_title()} sub={m.settings_access_sub()} />
      <SectionHead title={m.settings_access_posting()} />
      <Row label={m.settings_access_who_label()} help={m.settings_access_who_help()}>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-[30px] items-center gap-2 rounded-md border border-input bg-card pr-2 pl-2.5 text-[13px] outline-none hover:bg-accent">
            {form.whoCanPost === "anyone" ? m.settings_access_who_anyone() : m.settings_access_who_members()} <CaretDownIcon className="size-2.5 text-faint" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem onClick={() => setForm({ ...form, whoCanPost: "anyone" })}>{m.settings_access_who_anyone()}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setForm({ ...form, whoCanPost: "members" })}>{m.settings_access_who_members()}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Row>
      <Row label={m.settings_access_approval_label()} help={m.settings_access_approval_help()}>
        <Toggle on={form.requireApproval} onChange={(v) => setForm({ ...form, requireApproval: v })} label={m.settings_access_approval_label()} />
      </Row>
      <Row label={m.settings_access_anon_label()} help={m.settings_access_anon_help()}>
        <Toggle on={form.anonymousVoting} onChange={(v) => setForm({ ...form, anonymousVoting: v })} label={m.settings_access_anon_label()} />
      </Row>
      <div className="pt-7">
        <SectionHead title={m.settings_access_tabs()} />
      </div>
      <Row label={m.settings_roadmap()} help={m.settings_access_roadmap_help()}>
        <Toggle on={form.showRoadmap} onChange={(v) => setForm({ ...form, showRoadmap: v })} label={m.settings_access_roadmap_aria()} />
      </Row>
      <Row label={m.settings_changelog()} help={m.settings_access_changelog_help()}>
        <Toggle on={form.showChangelog} onChange={(v) => setForm({ ...form, showChangelog: v })} label={m.settings_access_changelog_aria()} />
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
