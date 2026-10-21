import { m } from "@openheard/i18n/messages";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { getLegalUrl } from "../functions/workspace";

export const Route = createFileRoute("/privacy")({
  loader: async () => {
    const url = await getLegalUrl({ data: "privacy" });
    if (url) throw redirect({ href: url });
  },
  head: () => ({
    meta: [
      { title: m.legal_privacy_title() },
      { property: "og:title", content: m.legal_privacy_title() },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12 md:py-20">
      <h1 className="text-2xl font-semibold tracking-tight">{m.legal_privacy_title()}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{m.legal_effective()}</p>

      <div className="prose-policy mt-10 flex flex-col gap-8 text-[15px] leading-[1.7] text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        <section>
          <h2>{m.legal_privacy_who_h()}</h2>
          <p>{m.legal_privacy_who_p()}</p>
        </section>

        <section>
          <h2>{m.legal_privacy_collect_h()}</h2>
          <ul>
            <li><strong>{m.legal_privacy_collect_account_label()}</strong> — {m.legal_privacy_collect_account_text()}</li>
            <li><strong>{m.legal_privacy_collect_content_label()}</strong> — {m.legal_privacy_collect_content_text()}</li>
            <li><strong>{m.legal_privacy_collect_technical_label()}</strong> — {m.legal_privacy_collect_technical_text()}</li>
            <li><strong>{m.legal_privacy_collect_cookies_label()}</strong> — {m.legal_privacy_collect_cookies_text()}</li>
          </ul>
        </section>

        <section>
          <h2>{m.legal_privacy_use_h()}</h2>
          <p>{m.legal_privacy_use_p()}</p>
        </section>

        <section>
          <h2>{m.legal_privacy_where_h()}</h2>
          <p>{m.legal_privacy_where_p()}</p>
        </section>

        <section>
          <h2>{m.legal_privacy_sub_h()}</h2>
          <ul>
            <li><strong>Cloudflare</strong> — {m.legal_privacy_sub_cloudflare_text()}</li>
            <li><strong>Google</strong> — {m.legal_privacy_sub_google_text()}</li>
          </ul>
        </section>

        <section>
          <h2>{m.legal_privacy_retention_h()}</h2>
          <p>{m.legal_privacy_retention_p()}</p>
        </section>

        <section>
          <h2>{m.legal_privacy_deletion_h()}</h2>
          <p>{m.legal_privacy_deletion_p()}</p>
        </section>

        <section>
          <h2>GDPR</h2>
          <p>{m.legal_privacy_gdpr_p()}</p>
          <ul>
            <li><strong>{m.legal_privacy_gdpr_basis_label()}</strong> — {m.legal_privacy_gdpr_basis_text()}</li>
            <li><strong>{m.legal_privacy_gdpr_rights_label()}</strong> — {m.legal_privacy_gdpr_rights_text()}</li>
            <li><strong>{m.legal_privacy_gdpr_controller_label()}</strong> — {m.legal_privacy_gdpr_controller_text()}</li>
          </ul>
        </section>

        <section>
          <h2>{m.legal_privacy_children_h()}</h2>
          <p>{m.legal_privacy_children_p()}</p>
        </section>

        <section>
          <h2>{m.legal_privacy_changes_h()}</h2>
          <p>{m.legal_privacy_changes_p()}</p>
        </section>
      </div>
    </main>
  );
}
