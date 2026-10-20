import { m } from "@openheard/i18n/messages";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { EmailLinkPage } from "@/components/email-link-page";
import { confirmChangelog } from "@/functions/notifications";

export const Route = createFileRoute("/changelog_/confirm")({
  validateSearch: (s: Record<string, unknown>) => ({ t: typeof s.t === "string" ? s.t : "" }),
  head: () => ({ meta: [{ title: m.changelog_confirm_head() }, { name: "robots", content: "noindex" }] }),
  component: ConfirmPage,
});

type Result = Awaited<ReturnType<typeof confirmChangelog>>;

// Confirms from the browser, so a link scanner cannot opt someone in.
function ConfirmPage() {
  const { t } = Route.useSearch();
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!t) return setResult({ ok: false });
    confirmChangelog({ data: { t } }).then(setResult, () => setResult({ ok: false }));
  }, [t]);

  if (!result) return <EmailLinkPage title={m.changelog_confirm_title()} body={m.changelog_confirm_wait()} />;
  if (!result.ok) return <EmailLinkPage title={m.changelog_confirm_expired_title()} body={m.changelog_confirm_expired_text()} />;
  return <EmailLinkPage title={m.changelog_confirm_done_title()} body={m.changelog_confirm_done_text({ workspace: result.workspaceName })} />;
}
