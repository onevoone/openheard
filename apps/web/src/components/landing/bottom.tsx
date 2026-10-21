import { CaretDownIcon, CaretUpIcon, CheckIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { m } from "@openheard/i18n/messages";
import { Button } from "@openheard/ui/components/button";
import { cn } from "@openheard/ui/lib/utils";
import { Collapsible } from "../collapsible";
import { LanguageSwitch } from "../language-switch";
import Logo from "../logo";
import { AnimatedList } from "./magic/animated-list";
import { BlurFade } from "./magic/blur-fade";
import { NumberTicker } from "./magic/number-ticker";
import { AnimatedSpan, Terminal, TypingAnimation } from "./magic/terminal";
import { Eyebrow, Framed, SectionHeader, Shot } from "./shared";
import { GITHUB } from "./top";

/* ---------------------------------------------------------------- product */

const products = () => [
  { id: "board", eyebrow: m.landing_product_board_eyebrow(), title: m.landing_product_board_title(), sub: m.landing_product_board_sub(), points: [m.landing_product_board_point_1(), m.landing_product_board_point_2(), m.landing_product_board_point_3()], shot: "/landing/board.png", alt: m.landing_product_board_alt(), center: true },
  { id: "roadmap", eyebrow: m.landing_product_roadmap_eyebrow(), title: m.landing_product_roadmap_title(), sub: m.landing_product_roadmap_sub(), points: [m.landing_product_roadmap_point_1(), m.landing_product_roadmap_point_2(), m.landing_product_roadmap_point_3()], shot: "/landing/dashboard-roadmap.png", alt: m.landing_product_roadmap_alt(), center: false },
  { id: "changelog", eyebrow: m.landing_product_changelog_eyebrow(), title: m.landing_product_changelog_title(), sub: m.landing_product_changelog_sub(), points: [m.landing_product_changelog_point_1(), m.landing_product_changelog_point_2(), m.landing_product_changelog_point_3()], shot: "/landing/changelog.png", alt: m.landing_product_changelog_alt(), center: true },
  { id: "dashboard", eyebrow: m.landing_product_dashboard_eyebrow(), title: m.landing_product_dashboard_title(), sub: m.landing_product_dashboard_sub(), points: [m.landing_product_dashboard_point_1(), m.landing_product_dashboard_point_2(), m.landing_product_dashboard_point_3()], shot: "/landing/dashboard-inbox.png", alt: m.landing_product_dashboard_alt(), center: false },
];

// Template growth section: Framed, SectionHeader, then a 2-col grid with
// divide-x, each item p-6, content on top, title + description at the end.
export function Products() {
  return (
    <Framed id="product">
      <SectionHeader title={m.landing_products_title()} sub={m.landing_products_sub()} />
      {products().map((p, i) => (
        <div key={p.id} className={cn("grid divide-y divide-border border-b border-border last:border-b-0 md:grid-cols-2 md:divide-x md:divide-y-0", i % 2 === 1 && "md:divide-x-reverse md:[&>*:first-child]:order-2")}>
          <div className="flex flex-col justify-center gap-2 p-6">
            <Eyebrow className="mb-1">{p.eyebrow}</Eyebrow>
            <h3 className="text-lg font-semibold tracking-tighter text-balance">{p.title}</h3>
            <p className="max-w-[46ch] text-pretty text-muted-foreground">{p.sub}</p>
            <ul role="list" className="mt-2 flex flex-col gap-2 text-[14px] text-muted-foreground">
              {p.points.map((pt) => (
                <li key={pt} className="flex items-start gap-2.5">
                  <CheckIcon weight="bold" className="mt-1 size-3.5 shrink-0 text-link" />
                  {pt}
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden p-4 md:p-6">
            <BlurFade inView>
              <Shot src={p.shot} alt={p.alt} className="aspect-[16/10]" imgClassName={cn("w-full md:w-[150%] md:max-w-none", p.center && "md:-ml-[25%]")} />
            </BlurFade>
          </div>
        </div>
      ))}
    </Framed>
  );
}

/* ------------------------------------------------------------------ bento */

const inboxRows = () => [
  { title: m.landing_demo_post_dark(), meta: [m.landing_status_progress(), "Mara Lindqvist", m.landing_bento_ago_2d()], votes: 128, hot: true },
  { title: m.landing_bento_row_2_title(), meta: [m.landing_status_planned(), "Tomás Ferreira", m.landing_bento_ago_5d()], votes: 86 },
  { title: m.landing_bento_row_3_title(), meta: [m.landing_status_review(), "Aiko Tanaka", m.landing_bento_ago_1w()], votes: 47 },
  { title: m.landing_bento_row_4_title(), meta: ["Devraj Patel", m.landing_bento_ago_1w()], votes: 41 },
];

function PostRow({ title, meta, votes, hot }: ReturnType<typeof inboxRows>[number]) {
  return (
    <div className={cn("flex w-full items-center gap-4 rounded-xl border px-5 py-4", hot ? "border-input bg-secondary" : "border-border bg-card")}>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium">{title}</div>
        <div className="mt-1 text-[12px] text-faint">{meta.join(" · ")}</div>
      </div>
      <div className={cn("flex w-12 shrink-0 flex-col items-center rounded-lg py-1.5 text-[14px] font-medium tabular-nums", hot ? "bg-link text-white" : "border border-input bg-accent text-foreground")}>
        <CaretUpIcon weight="bold" className="size-3" />
        {hot ? <NumberTicker value={votes} startValue={votes - 9} /> : votes}
      </div>
    </div>
  );
}

const columns = () => [
  [m.landing_status_planned(), "bg-status-planned", [[m.landing_bento_card_github(), 77], [m.landing_bento_card_saml(), 84]]],
  [m.landing_status_progress(), "bg-status-progress", [[m.landing_bento_card_merge(), 112]]],
  [m.landing_status_shipped(), "bg-status-shipped", [[m.landing_bento_card_dark(), 112]]],
] as const;

// Template bento: Framed, SectionHeader, grid md:grid-cols-2 overflow-hidden,
// each cell min-h 500 with a hairline top and left that run off-screen,
// art area clipped at 400, then title + description in p-6.
export function Bento() {
  return (
    <Framed>
      <SectionHeader title={m.landing_bento_title()} sub={m.landing_bento_sub()} />
      <div className="grid grid-cols-1 overflow-hidden md:grid-cols-2">
        <Cell title={m.landing_bento_votes_title()} desc={m.landing_bento_votes_desc()}>
          <div className="relative w-full max-w-[440px]">
            <AnimatedList delay={1600} className="w-full">
              {inboxRows().map((r) => (
                <PostRow key={r.title} {...r} />
              ))}
            </AnimatedList>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-background to-transparent" />
          </div>
        </Cell>
        <Cell title={m.landing_bento_loop_title()} desc={m.landing_bento_loop_desc()}>
          <div className="w-full max-w-[440px] rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2.5">
              <span className="grid size-5 place-items-center rounded-full bg-status-shipped text-[#0d0d0f]">
                <CheckIcon weight="bold" className="size-3" />
              </span>
              <span className="text-[15px] font-medium">{m.landing_bento_loop_entry()}</span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{m.landing_bento_loop_entry_text()}</p>
            <div className="mt-3 flex gap-2">
              {[m.landing_bento_loop_tag_dark(), m.landing_bento_loop_tag_merge(), "Slack"].map((t) => (
                <span key={t} className="rounded-md border border-border bg-background px-2 py-0.5 text-[12px] text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-[12px] text-status-shipped">
              <PaperPlaneTiltIcon className="size-3.5" />
              {m.landing_bento_loop_published()}
            </div>
          </div>
        </Cell>
        <Cell title={m.landing_bento_roadmap_title()} desc={m.landing_bento_roadmap_desc()}>
          <div className="grid w-full max-w-[480px] grid-cols-3 gap-2 md:gap-3">
            {columns().map(([name, dot, cards], col) => (
              <div key={name} className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground md:gap-2 md:text-[12px]">
                  <span className={cn("size-2 rounded-full", dot)} />
                  {name}
                </div>
                {cards.map(([c, votes]) => (
                  <div key={c} className={cn("rounded-lg border bg-card p-2 text-[12px] font-medium md:p-3 md:text-[13px]", col === 2 ? "border-status-shipped/60" : "border-border")}>
                    {c}
                    <div className="mt-1 text-[10px] font-normal text-faint tabular-nums md:mt-1.5 md:text-[11px]">▲ {votes}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Cell>
        <Cell title={m.landing_bento_agent_title()} desc={m.landing_bento_agent_desc()}>
          <Terminal title="claude" className="max-w-[440px]">
            <TypingAnimation delay={200}>{`› ${m.landing_bento_term_ask()}`}</TypingAnimation>
            <AnimatedSpan delay={1800} className="pl-4 text-link">└ openheard.list_posts sort=top status=open</AnimatedSpan>
            <AnimatedSpan delay={2300} className="text-muted-foreground">{`● 1. ${m.landing_bento_term_top_1()} · 128`}</AnimatedSpan>
            <AnimatedSpan delay={2600} className="text-muted-foreground">{`● 2. ${m.landing_bento_term_top_2()} · 86`}</AnimatedSpan>
            <AnimatedSpan delay={2900} className="text-muted-foreground">{`● 3. ${m.landing_bento_term_top_3()} · 47`}</AnimatedSpan>
          </Terminal>
        </Cell>
      </div>
    </Framed>
  );
}

function Cell({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[400px] flex-col items-start justify-end p-0.5 md:min-h-[520px] before:absolute before:top-0 before:-left-0.5 before:z-10 before:h-screen before:w-px before:bg-border before:content-[''] after:absolute after:-top-0.5 after:left-0 after:z-10 after:h-px after:w-screen after:bg-border after:content-['']">
      <div className="relative flex size-full h-full max-h-[320px] flex-1 items-center justify-center overflow-hidden p-4 md:max-h-[380px] md:p-6">{children}</div>
      <div className="flex flex-col gap-2 p-6">
        <h3 className="text-lg font-semibold tracking-tighter">{title}</h3>
        <p className="text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- loop */

const moments = () => [
  ["01", m.landing_loop_post_title(), m.landing_loop_post_text()],
  ["02", m.landing_loop_vote_title(), m.landing_loop_vote_text()],
  ["03", m.landing_loop_ship_title(), m.landing_loop_ship_text()],
  ["04", m.landing_loop_return_title(), m.landing_loop_return_text()],
];

export function Loop() {
  const steps = moments();
  return (
    <Framed>
      <div className="grid divide-y divide-border md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:divide-x md:divide-y-0">
        <div className="flex flex-col gap-4 p-6">
          <Eyebrow>{m.landing_loop_eyebrow()}</Eyebrow>
          <h2 className="max-w-[20ch] text-3xl font-medium tracking-tighter text-balance md:text-4xl">{m.landing_loop_title()}</h2>
          <div className="flex max-w-[60ch] flex-col gap-4 leading-relaxed text-pretty text-muted-foreground">
            <p>{m.landing_loop_p1()}</p>
            <p>{m.landing_loop_p2()}</p>
            <p>{m.landing_loop_p3()}</p>
          </div>
        </div>
        <div className="flex flex-col p-6" role="list">
          {steps.map(([n, t, d], i) => (
            <div key={n} role="listitem" className={cn("flex gap-5 py-5 first:pt-0 last:pb-0", i < steps.length - 1 && "border-b border-border")}>
              <span className="pt-0.5 text-[13px] text-link tabular-nums">{n}</span>
              <div>
                <p className="text-[16px] font-medium">{t}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Framed>
  );
}

/* ------------------------------------------------------------------- own */

const own = () => [
  [m.landing_own_cloudflare_title(), m.landing_own_cloudflare_text()],
  [m.landing_own_nothing_title(), m.landing_own_nothing_text()],
  [m.landing_own_agpl_title(), m.landing_own_agpl_text()],
  [m.landing_own_cloud_title(), m.landing_own_cloud_text()],
];
const OWN_COUNT = 4;

const OWN_ADVANCE_MS = 5000;

export function Own() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const startRef = useRef(Date.now());
  const rafRef = useRef<number>(0);
  const reduce = useReducedMotion();

  const advance = useCallback(() => {
    setActive((i) => (i + 1) % OWN_COUNT);
    setProgress(0);
    startRef.current = Date.now();
  }, []);

  // No auto-advance under reduced motion; the tabs still work on click.
  useEffect(() => {
    if (paused || reduce) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    startRef.current = Date.now() - progress * OWN_ADVANCE_MS;

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(elapsed / OWN_ADVANCE_MS, 1);
      setProgress(p);
      if (p >= 1) {
        advance();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused, reduce, active, advance, progress]);

  const select = (i: number) => {
    setActive(i);
    setProgress(0);
    startRef.current = Date.now();
  };

  return (
    <section id="own" className="relative flex w-full scroll-mt-16 flex-col items-center justify-center gap-5">
      <SectionHeader title={m.landing_own_title()} />
      <div className="grid w-full items-center gap-6 px-4 pb-10 md:grid-cols-[400px_1fr] md:gap-10 md:px-6" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="flex flex-col">
          {own().map(([t, d], i) => (
            <button key={t} type="button" onClick={() => select(i)} className={cn("relative flex flex-col gap-1 overflow-hidden rounded-lg px-4 py-3 text-left transition-colors md:px-5 md:py-4", active === i ? "bg-secondary/60" : "hover:bg-accent/40")}>
              {active === i && (
                <div className="absolute inset-y-0 left-0 w-0.5 rounded-full bg-link" style={{ height: `${progress * 100}%`, transition: paused ? "none" : undefined }} />
              )}
              <span className={cn("text-[15px] font-medium", active === i ? "text-foreground" : "text-muted-foreground")}>{t}</span>
              <Collapsible open={active === i}>
                <span className="block pt-1 text-[14px] leading-relaxed text-muted-foreground">{d}</span>
              </Collapsible>
            </button>
          ))}
        </div>
        <Terminal title="zsh — ~/openheard" className="min-h-[280px] md:min-h-[320px]">
          <TypingAnimation delay={200}>$ cd packages/infra && bunx alchemy login --configure</TypingAnimation>
          <TypingAnimation delay={2600}>$ bun run deploy</TypingAnimation>
          <AnimatedSpan delay={4200} className="pl-4 text-status-shipped">{`✓ ${m.landing_own_term_created()}`}</AnimatedSpan>
          <AnimatedSpan delay={4700} className="pl-4 text-status-shipped">{`✓ ${m.landing_own_term_migrated()}`}</AnimatedSpan>
          <AnimatedSpan delay={5300} className="pl-4 text-link">→ https://openheard.acme.workers.dev</AnimatedSpan>
          <AnimatedSpan delay={5900} className="text-muted-foreground">{m.landing_own_term_admin()}</AnimatedSpan>
        </Terminal>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- pricing */

const plans = () => [
  { name: m.landing_pricing_free_name(), price: "$0", per: m.landing_pricing_per(), desc: m.landing_pricing_free_desc(), cta: m.landing_cta_start(), lead: m.landing_pricing_free_lead(), items: [m.landing_pricing_free_item_1(), m.landing_pricing_free_item_2(), m.landing_pricing_free_item_3(), m.landing_pricing_free_item_4(), m.landing_pricing_free_item_5(), m.landing_pricing_free_item_6()] },
  { name: "Pro", price: "$19", per: m.landing_pricing_per(), desc: m.landing_pricing_pro_desc(), cta: m.landing_pricing_pro_cta(), primary: true, lead: m.landing_pricing_pro_lead(), items: [m.landing_pricing_pro_item_1(), m.landing_pricing_pro_item_2()] },
];

// Template pricing: plain section gap-10 pb-10, SectionHeader, cards in a
// grid with rows [header, button, hr, features], round check circles.
export function Pricing() {
  return (
    <section id="pricing" className="relative flex w-full scroll-mt-16 flex-col items-center justify-center gap-10 pb-10">
      <SectionHeader title={m.landing_pricing_title()} sub={m.landing_pricing_sub()} />
      <div className="mx-auto grid w-full max-w-[820px] gap-4 px-6 min-[650px]:grid-cols-2">
        {plans().map((p) => (
          <div key={p.name} className={cn("relative grid h-full grid-rows-[auto_auto_auto_1fr] rounded-xl border", p.primary ? "border-input bg-accent" : "border-border bg-[#f9fafb]/[0.02]")}>
            <div className="flex flex-col gap-4 p-4">
              <p className="flex h-6 items-center text-sm">
                {p.name}
                {p.primary ? <span className="ml-2 inline-flex h-6 w-fit items-center justify-center rounded-full bg-[#4a6ae0] px-2 text-xs font-medium text-white">{m.landing_pricing_popular()}</span> : null}
              </p>
              <div className="mt-2 flex items-baseline">
                <span className="text-4xl font-semibold tracking-tight tabular-nums">{p.price}</span>
                <span className="ml-2 text-muted-foreground">{p.per}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
            </div>
            <div className="flex flex-col gap-2 p-4">
              <Button full size="lg" nativeButton={false} variant={p.primary ? "primary" : "secondary"} render={<Link to="/start" />}>
                {p.cta}
              </Button>
            </div>
            <hr className="border-border" />
            <div className="p-4">
              <p className="mb-4 text-sm text-muted-foreground">{p.lead}</p>
              <ul role="list" className="space-y-3">
                {p.items.map((it) => (
                  <li key={it} className="flex items-center gap-2 text-sm">
                    <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", p.primary ? "border-border bg-muted-foreground/40" : "border-primary/20")}>
                      <CheckIcon weight="bold" className="size-2.5" />
                    </span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
      <p className="px-6 text-center text-[14px] text-muted-foreground">
        {m.landing_pricing_note()}{" "}
        <a href="#own" className="text-foreground underline underline-offset-4">
          {m.landing_pricing_note_link()}
        </a>
        .
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------- faq */

const faq = () => [
  [m.landing_faq_free_q(), m.landing_faq_free_a()],
  [m.landing_faq_import_q(), m.landing_faq_import_a()],
  [m.landing_faq_stack_q(), m.landing_faq_stack_a()],
  [m.landing_faq_cloud_q(), m.landing_faq_cloud_a()],
  [m.landing_faq_agpl_q(), m.landing_faq_agpl_a()],
  [m.landing_faq_contribute_q(), m.landing_faq_contribute_a()],
];

// Template FAQ: plain section gap-10 pb-10, max-w-3xl px-10, each row a
// bordered bg-accent pill, answer in a matching box under it.
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative flex w-full flex-col items-center justify-center gap-10 pb-10">
      <SectionHeader title={m.landing_faq_title()} sub={m.landing_faq_sub()} />
      <div className="mx-auto grid w-full max-w-3xl gap-2 px-6 md:px-10">
        {faq().map(([q, a], i) => (
          <div key={q} className="grid gap-2">
            <div>
              <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className={cn("flex w-full cursor-pointer items-center justify-between gap-6 rounded-lg border border-border bg-accent px-4 py-3.5 text-left text-[15px] font-medium", open === i && "ring-2 ring-ring/20")}>
                {q}
                <CaretDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", open === i && "rotate-180")} />
              </button>
            </div>
            <Collapsible open={open === i}>
              <div className="rounded-lg border border-border bg-accent p-3 text-[14px] leading-relaxed font-medium text-muted-foreground">{a}</div>
            </Collapsible>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- closing */

// Template CTA: a 400px rounded card with a background, title in the upper
// half, button and subtext pinned at the bottom.
export function Closing() {
  return (
    <section id="cta" className="flex w-full flex-col items-center justify-center">
      <div className="w-full">
        <div className="relative z-20 h-[400px] w-full overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <div aria-hidden className="absolute inset-0 [background:radial-gradient(60%_80%_at_50%_0%,rgba(110,139,255,.28),transparent_70%)]" />
          <div className="absolute inset-0 -top-24 flex flex-col items-center justify-center md:-top-40">
            <h2 className="max-w-xs text-center text-3xl font-medium tracking-tighter text-balance md:max-w-xl md:text-7xl">{m.landing_closing_title()}</h2>
            <div className="absolute bottom-10 flex flex-col items-center justify-center gap-3">
              <Button size="lg" arrow nativeButton={false} render={<Link to="/start" />}>
                {m.landing_cta_start()}
              </Button>
              <span className="text-sm text-muted-foreground">{m.landing_closing_selfhost()}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- footer */

const footerCols = () => [
  [m.landing_nav_product(), [[m.landing_footer_board(), "#product"], [m.landing_nav_agents(), "#agents"], [m.landing_nav_pricing(), "#pricing"], [m.landing_footer_changelog(), "/changelog"]]],
  [m.landing_footer_opensource(), [["GitHub", GITHUB], [m.landing_footer_contributing(), GITHUB + "/blob/main/CONTRIBUTING.md"], [m.landing_footer_security(), GITHUB + "/blob/main/SECURITY.md"], [m.landing_footer_licence(), GITHUB + "/blob/main/LICENSE"]]],
  [m.landing_footer_legal(), [[m.landing_footer_privacy(), "/privacy"], [m.landing_footer_terms(), "/terms"]]],
] as const;

// Template footer: p-10, brand block left (max-w-xs), link columns right,
// then a faded decorative band at the bottom.
export function Footer() {
  return (
    <footer id="footer" className="w-full pb-0">
      <div className="flex flex-col p-6 md:flex-row md:items-center md:justify-between md:p-10">
        <div className="mx-0 flex max-w-xs flex-col items-start justify-start gap-y-5">
          <Link to="/" className="flex items-center gap-2.5 text-xl font-semibold">
            <Logo size={30} />
            openheard
          </Link>
          <p className="font-medium tracking-tight text-muted-foreground">{m.landing_footer_tagline()}</p>
          <p className="text-[12px] text-muted-foreground">AGPL-3.0 · © {new Date().getFullYear()} openheard</p>
          <LanguageSwitch className="text-[12px]" />
        </div>
        <div className="pt-5 md:w-1/2">
          <div className="flex flex-col items-start justify-start gap-y-5 md:flex-row md:items-start md:justify-between lg:pl-10">
            {footerCols().map(([title, links]) => (
              <ul key={title} role="list" className="flex flex-col gap-y-2">
                <li className="mb-2 text-sm font-semibold">{title}</li>
                {links.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-[15px]/snug text-muted-foreground hover:text-foreground">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
      <div className="relative z-0 mt-16 h-40 w-full md:h-56">
        <div className="absolute inset-0 z-10 bg-linear-to-t from-transparent from-40% to-background" />
        <div aria-hidden className="absolute inset-0 mx-6 bg-[size:14px_14px] text-foreground/10 [background-image:radial-gradient(currentColor_1px,transparent_1px)]" />
      </div>
    </footer>
  );
}
