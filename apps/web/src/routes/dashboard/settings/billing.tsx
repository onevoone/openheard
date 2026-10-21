import { m } from "@openheard/i18n/messages";
import { Button } from "@openheard/ui/components/button";
import { CheckIcon } from "@phosphor-icons/react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SectionHead } from "@/components/admin/panel";
import { getBilling, openPortal, startCheckout } from "@/functions/billing";
import { PLANS } from "@/lib/plans";
import { fullDate } from "@/lib/time";
import { PageHead } from "@/routes/dashboard/settings";
import { cn } from "@openheard/ui/lib/utils";

export const Route = createFileRoute("/dashboard/settings/billing")({
  validateSearch: (s: Record<string, unknown>) => ({ checkout: s.checkout === "success" ? ("success" as const) : undefined }),
  loader: () => getBilling(),
  head: () => ({ meta: [{ title: m.settings_billing_meta() }] }),
  component: Billing,
});

function Billing() {
  const b = Route.useLoaderData();
  const search = Route.useSearch();
  const router = useRouter();
  const [interval, setBillingInterval] = useState<"month" | "year">("year");
  const [busy, setBusy] = useState(false);

  // Stripe redirects back before the webhook lands. Poll a few times so the page flips to Pro on its own.
  useEffect(() => {
    if (search.checkout !== "success" || b.plan === "pro") return;
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      router.invalidate();
      if (tries >= 10) clearInterval(t);
    }, 1500);
    return () => clearInterval(t);
  }, [search.checkout, b.plan, router]);

  async function go(fn: () => Promise<{ url: string }>) {
    setBusy(true);
    try {
      const { url } = await fn();
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : m.settings_action_failed());
      setBusy(false);
    }
  }

  const pro = b.plan === "pro";
  const price = interval === "month" ? PLANS.pro.monthly : PLANS.pro.yearly;

  return (
    <>
      <PageHead title={m.settings_billing_title()} sub={m.settings_billing_sub()} />

      <SectionHead title={m.settings_billing_current()} />
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3.5">
        <div className="flex flex-col gap-0.5">
          <div className="text-[15px] font-semibold">{PLANS[b.plan].name}</div>
          <div className="text-[13px] text-muted-foreground">
            {m.settings_billing_usage({ owned: b.owned, limit: b.limit })}
            {pro && b.renewsAt ? <span className="text-faint"> · {m.settings_billing_renews({ date: fullDate(b.renewsAt) })}</span> : null}
          </div>
        </div>
        {pro ? (
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => go(() => openPortal())}>
            {m.settings_billing_manage()}
          </Button>
        ) : b.hasCustomer ? (
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => go(() => openPortal())}>
            {m.settings_billing_history()}
          </Button>
        ) : null}
      </div>

      {!pro ? (
        <>
          <SectionHead
            title={m.settings_billing_upgrade_title()}
            right={
              <div className="flex gap-0.5 rounded-md bg-secondary p-0.5">
                {(["month", "year"] as const).map((i) => (
                  <button key={i} type="button" onClick={() => setBillingInterval(i)} className={cn("rounded-md px-2.5 py-1 text-xs", interval === i ? "bg-accent text-foreground" : "text-faint hover:text-muted-foreground")}>
                    {i === "month" ? m.settings_billing_monthly() : m.settings_billing_yearly()}
                  </button>
                ))}
              </div>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Plan name="Free" price="$0" per={m.settings_billing_forever()} current={b.plan === "free"} features={[m.settings_billing_workspaces({ count: PLANS.free.workspaces }), m.settings_billing_f_unlimited(), m.settings_billing_f_public(), m.settings_billing_f_api()]} />
            <Plan
              name="Pro"
              price={`$${price}`}
              per={interval === "month" ? m.settings_billing_per_month() : m.settings_billing_per_year()}
              highlight
              features={[m.settings_billing_workspaces({ count: PLANS.pro.workspaces }), m.settings_billing_f_everything(), m.settings_billing_f_support()]}
              action={
                b.configured ? (
                  <Button size="sm" full disabled={busy} onClick={() => go(() => startCheckout({ data: { interval } }))}>
                    {m.settings_billing_upgrade()}
                  </Button>
                ) : (
                  <p className="text-center text-xs text-faint">{m.settings_billing_soon()}</p>
                )
              }
            />
          </div>
        </>
      ) : null}
    </>
  );
}

function Plan({ name, price, per, features, current, highlight, action }: { name: string; price: string; per: string; features: string[]; current?: boolean; highlight?: boolean; action?: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-lg border p-4", highlight ? "border-link/50 bg-link/[.04]" : "bg-card")}>
      <div className="flex items-baseline justify-between">
        <div className="text-[14px] font-semibold">{name}</div>
        {current ? <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{m.settings_billing_current_badge()}</span> : null}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[26px] font-semibold tracking-[-0.02em]">{price}</span>
        <span className="text-[12px] text-faint">{per}</span>
      </div>
      <ul className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <CheckIcon weight="bold" className="size-3 text-status-shipped" /> {f}
          </li>
        ))}
      </ul>
      {action ? <div className="mt-auto pt-1">{action}</div> : null}
    </div>
  );
}
