import { m } from "@openheard/i18n/messages";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { getLegalUrl } from "../functions/workspace";

export const Route = createFileRoute("/terms")({
  loader: async () => {
    const url = await getLegalUrl({ data: "terms" });
    if (url) throw redirect({ href: url });
  },
  head: () => ({
    meta: [
      { title: m.legal_terms_title() },
      { property: "og:title", content: m.legal_terms_title() },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12 md:py-20">
      <h1 className="text-2xl font-semibold tracking-tight">{m.legal_terms_title()}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{m.legal_effective()}</p>

      <div className="prose-policy mt-10 flex flex-col gap-8 text-[15px] leading-[1.7] text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        <section>
          <h2>{m.legal_terms_service_h()}</h2>
          <p>{m.legal_terms_service_p()}</p>
        </section>

        <section>
          <h2>{m.legal_terms_account_h()}</h2>
          <p>{m.legal_terms_account_p()}</p>
        </section>

        <section>
          <h2>{m.legal_terms_data_h()}</h2>
          <p>{m.legal_terms_data_p()}</p>
        </section>

        <section>
          <h2>{m.legal_terms_use_h()}</h2>
          <p>{m.legal_terms_use_p()}</p>
          <ul>
            <li>{m.legal_terms_use_1()}</li>
            <li>{m.legal_terms_use_2()}</li>
            <li>{m.legal_terms_use_3()}</li>
            <li>{m.legal_terms_use_4()}</li>
          </ul>
        </section>

        <section>
          <h2>{m.legal_terms_suspension_h()}</h2>
          <p>{m.legal_terms_suspension_p()}</p>
        </section>

        <section>
          <h2>{m.legal_terms_plans_h()}</h2>
          <p>{m.legal_terms_plans_p()}</p>
        </section>

        <section>
          <h2>{m.legal_terms_availability_h()}</h2>
          <p>{m.legal_terms_availability_p()}</p>
        </section>

        <section>
          <h2>{m.legal_terms_warranties_h()}</h2>
          <p>{m.legal_terms_warranties_p()}</p>
        </section>

        <section>
          <h2>{m.legal_terms_liability_h()}</h2>
          <p>{m.legal_terms_liability_p()}</p>
        </section>

        <section>
          <h2>{m.legal_terms_law_h()}</h2>
          <p>{m.legal_terms_law_p()}</p>
        </section>

        <section>
          <h2>{m.legal_terms_changes_h()}</h2>
          <p>{m.legal_terms_changes_p()}</p>
        </section>

        <section>
          <h2>{m.legal_terms_contact_h()}</h2>
          <p>{m.legal_terms_contact_p()}</p>
        </section>
      </div>
    </main>
  );
}
