import { m } from "@openheard/i18n/messages";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { EmailLinkPage } from "@/components/email-link-page";
import { unsubscribe } from "@/functions/notifications";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s: Record<string, unknown>) => ({ t: typeof s.t === "string" ? s.t : "" }),
  head: () => ({ meta: [{ title: m.unsub_head() }, { name: "robots", content: "noindex" }] }),
  component: UnsubscribePage,
});

type Result = Awaited<ReturnType<typeof unsubscribe>>;

// Runs from the browser, not the loader, so a mail scanner that fetches the
// link without running scripts does not unsubscribe anyone.
function UnsubscribePage() {
  const { t } = Route.useSearch();
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!t) return setResult({ ok: false });
    unsubscribe({ data: { t } }).then(setResult, () => setResult({ ok: false }));
  }, [t]);

  if (!result) return <EmailLinkPage title={m.unsub_title()} body={m.changelog_confirm_wait()} />;
  if (!result.ok) return <EmailLinkPage title={m.unsub_broken_title()} body={m.unsub_broken_text()} />;
  return (
    <EmailLinkPage
      title={m.unsub_done_title()}
      body={result.kind === "status" ? m.unsub_done_status({ workspace: result.workspaceName }) : m.unsub_done_changelog({ workspace: result.workspaceName })}
    />
  );
}
