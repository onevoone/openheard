import { m } from "@openheard/i18n/messages";
import { LoadingButton } from "@openheard/ui/components/interior/loading-button";
import { createFileRoute, useLoaderData, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Row, SectionHead } from "@/components/admin/panel";
import { Avatar } from "@/components/bits";
import { saveProfile } from "@/functions/settings";
import { PageHead } from "@/routes/dashboard/settings";

export const Route = createFileRoute("/dashboard/settings/profile")({
  head: () => ({ meta: [{ title: m.settings_profile_meta() }] }),
  component: Profile,
});

function Profile() {
  const root = useLoaderData({ from: "__root__" });
  const router = useRouter();
  const me = root.user!;
  const [name, setName] = useState(me.name);
  const dirty = name.trim() !== me.name;

  function save() {
    saveProfile({ data: { name } })
      .then(() => router.invalidate())
      .catch((err) => toast.error(err instanceof Error ? err.message : m.settings_save_failed()));
  }

  return (
    <>
      <PageHead title={m.settings_profile_title()} sub={m.settings_profile_sub()} />
      <SectionHead title={m.settings_profile_section()} />
      <Row label={m.settings_profile_picture_label()} help={m.settings_profile_picture_help()}>
        <Avatar name={me.name} image={me.image} size={36} />
      </Row>
      <Row label={m.settings_profile_name_label()} help={m.settings_profile_name_help()}>
        <input value={name} onChange={(e) => setName(e.target.value)} aria-label={m.settings_profile_name_aria()} className="h-8 w-[280px] rounded-lg border border-input bg-card px-2.5 text-[13px] outline-none focus:border-ring/60" />
      </Row>
      <Row label={m.settings_profile_email_label()} help={m.settings_profile_email_help()}>
        <span className="text-[13px] text-muted-foreground">{me.email}</span>
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
