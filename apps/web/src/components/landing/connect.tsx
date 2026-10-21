import { ArrowRightIcon, CheckIcon, GlobeSimpleIcon, HashIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { m } from "@openheard/i18n/messages";
import { cn } from "@openheard/ui/lib/utils";
import { BlurFade } from "./magic/blur-fade";
import { Framed, SectionHeader } from "./shared";

// Three shipped features that reach outside the board: team alerts, emails
// to followers, and reading a brand off a website. Same cell framing as the
// bento, three across.
export function Connect() {
  return (
    <Framed id="connect">
      <SectionHeader title={m.landing_connect_title()} sub={m.landing_connect_sub()} />
      <div className="grid grid-cols-1 overflow-hidden md:grid-cols-3">
        <Cell title={m.landing_connect_alerts_title()} desc={m.landing_connect_alerts_desc()}>
          <Alert />
        </Cell>
        <Cell title={m.landing_connect_emails_title()} desc={m.landing_connect_emails_desc()}>
          <Email />
        </Cell>
        <Cell title={m.landing_connect_brand_title()} desc={m.landing_connect_brand_desc()}>
          <Brand />
        </Cell>
      </div>
    </Framed>
  );
}

function Cell({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div className="relative flex flex-col items-start p-0.5 before:absolute before:top-0 before:-left-0.5 before:z-10 before:h-screen before:w-px before:bg-border before:content-[''] after:absolute after:-top-0.5 after:left-0 after:z-10 after:h-px after:w-screen after:bg-border after:content-['']">
      <div className="relative flex min-h-[260px] w-full items-center justify-center overflow-hidden p-4 md:h-[320px] md:p-5">
        <BlurFade inView className="w-full max-w-[340px]">
          {children}
        </BlurFade>
      </div>
      <div className="flex flex-col gap-2 p-6">
        <h3 className="text-lg font-semibold tracking-tighter">{title}</h3>
        <p className="text-pretty text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

// A chat message in the shape the Slack and Discord payloads produce:
// linked title, then the meta line.
function Alert() {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-1.5 text-[12px] text-faint">
          <HashIcon className="size-3.5" />
          product-feedback
        </div>
        <div className="mt-3 flex gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-[13px] font-semibold">o</span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 text-[13px]">
              <span className="font-semibold">openheard</span>
              <span className="text-[11px] text-faint tabular-nums">10:42</span>
            </div>
            <p className="mt-1 text-[14px] font-medium text-link">{m.landing_demo_post_dark()}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground tabular-nums">{m.landing_connect_alert_meta({ author: "Mara Lindqvist", from: m.landing_status_planned(), to: m.landing_status_progress() })}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {["Slack", "Discord", m.landing_connect_alert_webhook()].map((k) => (
          <span key={k} className="rounded-md border border-border bg-background px-2 py-0.5 text-[12px] text-muted-foreground">
            {k}
          </span>
        ))}
      </div>
      <code className="truncate font-mono text-[11px] text-faint">x-openheard-signature: t=1767225600,v1=9f2c…</code>
    </div>
  );
}

// The status change email: who it is from, the post, old and new status.
function Email() {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-0.5 border-b border-border px-4 py-3 text-[12px]">
        <span className="font-medium">Acme feedback</span>
        <span className="truncate text-muted-foreground">{m.landing_connect_email_subject({ title: m.landing_demo_post_dark() })}</span>
      </div>
      <div className="p-4">
        <p className="text-[12px] text-faint">{m.landing_connect_email_intro()}</p>
        <p className="mt-2 text-[15px] font-semibold tracking-tight">{m.landing_demo_post_dark()}</p>
        <div className="mt-3 flex items-center gap-2 text-[12px]">
          <Status color="bg-status-progress" label={m.landing_status_progress()} />
          <ArrowRightIcon className="size-3 text-faint" />
          <Status color="bg-status-shipped" label={m.landing_status_shipped()} />
        </div>
        <div className="mt-4 border-t border-border pt-3 text-[11px] text-faint">
          <span className="underline underline-offset-2">{m.landing_connect_email_stop()}</span>
        </div>
      </div>
    </div>
  );
}

function Status({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", color)} />
      {label}
    </span>
  );
}

const swatches = ["#ff6a3d", "#1d1b2e", "#f4efe6", "#3a7d5c"];

// The Match my website result: what was found, ticked to apply. Font is
// shown for reference only, as in settings.
function Brand() {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-[13px]">
        <GlobeSimpleIcon className="size-3.5 text-faint" />
        <span className="flex-1 truncate">acme.com</span>
        <span className="text-[12px] text-status-shipped">{m.landing_connect_brand_found()}</span>
      </div>
      <div className="flex flex-col divide-y divide-border px-4 text-[13px]">
        <Found label={m.landing_connect_brand_logo()} ticked>
          <span className="grid size-6 place-items-center rounded-md bg-[#ff6a3d] text-[12px] font-bold text-[#1d1b2e]">A</span>
        </Found>
        <Found label={m.landing_connect_brand_name()} ticked>
          <span>Acme</span>
        </Found>
        <Found label={m.landing_connect_brand_accent()} ticked>
          <span className="flex gap-1.5">
            {swatches.map((c, i) => (
              <span key={c} className={cn("size-4 rounded-full border border-black/20", i === 0 && "ring-2 ring-foreground ring-offset-2 ring-offset-card")} style={{ background: c }} />
            ))}
          </span>
        </Found>
        <Found label={m.landing_connect_brand_font()}>
          <span className="text-muted-foreground">{m.landing_connect_brand_font_note()}</span>
        </Found>
      </div>
    </div>
  );
}

function Found({ label, ticked, children }: { label: string; ticked?: boolean; children: ReactNode }) {
  return (
    <div className="flex h-11 items-center justify-between gap-3">
      <span className="flex items-center gap-2 font-medium">
        {ticked ? (
          <span className="grid size-3.5 place-items-center rounded-[4px] bg-foreground text-background">
            <CheckIcon weight="bold" className="size-2.5" />
          </span>
        ) : (
          <span className="size-3.5" />
        )}
        {label}
      </span>
      {children}
    </div>
  );
}
