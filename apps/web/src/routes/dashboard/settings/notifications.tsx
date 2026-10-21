import { m } from "@openheard/i18n/messages";
import { LoadingButton } from "@openheard/ui/components/interior/loading-button";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Row, SectionHead, Toggle } from "@/components/admin/panel";
import { getEmailPrefs, saveEmailPrefs } from "@/functions/notifications";
import { getNotificationPrefs, saveNotificationPrefs } from "@/functions/settings";
import { PageHead } from "@/routes/dashboard/settings";

export const Route = createFileRoute("/dashboard/settings/notifications")({
  loader: async () => ({ team: await getNotificationPrefs(), email: await getEmailPrefs() }),
  head: () => ({ meta: [{ title: m.settings_notif_meta() }] }),
  component: Notifications,
});

function Notifications() {
  const saved = Route.useLoaderData();
  const router = useRouter();
  const [form, setForm] = useState(saved.team);
  const [email, setEmail] = useState(saved.email);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved.team) || JSON.stringify(email) !== JSON.stringify(saved.email);

  async function save() {
    const [, res] = await Promise.all([saveNotificationPrefs({ data: form }), saveEmailPrefs({ data: email })]);
    if (res.confirmSent) {
      toast.success(m.settings_notif_confirm_sent());
      // Off until the link is clicked, which is what the saved prefs say too.
      setEmail((e) => ({ ...e, changelog: false }));
    }
    await router.invalidate();
  }

  return (
    <>
      <PageHead title={m.settings_notif_title()} sub={m.settings_notif_sub()} />
      <SectionHead title={m.settings_notif_section()} />
      <Row label={m.settings_notif_post_label()} help={m.settings_notif_post_help()}>
        <Toggle on={form.notifyNewPost} onChange={(v) => setForm({ ...form, notifyNewPost: v })} label={m.settings_notif_post_aria()} />
      </Row>
      <Row label={m.settings_notif_comment_label()} help={m.settings_notif_comment_help()}>
        <Toggle on={form.notifyComment} onChange={(v) => setForm({ ...form, notifyComment: v })} label={m.settings_notif_comment_aria()} />
      </Row>
      <Row label={m.settings_notif_status_label()} help={m.settings_notif_status_help()}>
        <Toggle on={form.notifyStatus} onChange={(v) => setForm({ ...form, notifyStatus: v })} label={m.settings_notif_status_aria()} />
      </Row>
      <Row label={m.settings_notif_followed_label()} help={m.settings_notif_followed_help()}>
        <Toggle on={email.followedPosts} onChange={(v) => setEmail({ ...email, followedPosts: v })} label={m.settings_notif_followed_aria()} />
      </Row>
      <Row label={m.settings_notif_ships_label()} help={m.settings_notif_ships_help()}>
        <Toggle on={email.changelog} onChange={(v) => setEmail({ ...email, changelog: v })} label={m.settings_changelog()} />
      </Row>
      {email.workspaceStatusEmails !== undefined && (
        <>
          <div className="pt-6">
            <SectionHead title={m.settings_notif_users_section()} />
          </div>
          <Row label={m.settings_notif_users_label()} help={m.settings_notif_users_help()}>
            <Toggle on={email.workspaceStatusEmails} onChange={(v) => setEmail({ ...email, workspaceStatusEmails: v })} label={m.settings_notif_users_aria()} />
          </Row>
        </>
      )}
      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <span className="text-xs text-faint">{dirty ? m.settings_unsaved() : m.settings_saved()}</span>
        <LoadingButton onAction={save} disabled={!dirty} successLabel={m.settings_saved()} onError={(err) => toast.error(err instanceof Error ? err.message : m.settings_save_failed())}>
          {m.settings_save()}
        </LoadingButton>
      </div>
    </>
  );
}
