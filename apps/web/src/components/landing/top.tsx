import { ListIcon, XIcon } from "@phosphor-icons/react";
import { Link, useLoaderData } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion, useScroll } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { m } from "@openheard/i18n/messages";
import { Button } from "@openheard/ui/components/button";
import { cn } from "@openheard/ui/lib/utils";
import { DEMO_WORKSPACE_ID } from "@/lib/demo";
import { workspaceUrl } from "@/lib/workspace-url";
import Logo from "../logo";
import { BlurFade } from "./magic/blur-fade";
import { BorderBeam } from "./magic/border-beam";
import { AnimatedSpan, Terminal, TypingAnimation } from "./magic/terminal";
import { Framed, SectionHeader } from "./shared";

export const GITHUB = "https://github.com/Heilonng23/openheard";

const links = () => [
  { href: "#product", label: m.landing_nav_product() },
  { href: "#agents", label: m.landing_nav_agents() },
  { href: "#own", label: m.landing_nav_selfhost() },
  { href: "#pricing", label: m.landing_nav_pricing() },
  { href: GITHUB, label: "GitHub" },
];

export function Nav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => scrollY.on("change", (v) => setScrolled(v > 10)), [scrollY]);
  const root = useLoaderData({ from: "__root__" });
  const own = (root as { ownWorkspaces?: { id: string; name: string }[] }).ownWorkspaces;
  const ctaHref = useMemo(() => {
    if (root?.user && own && own.length > 0) return workspaceUrl(own[own.length - 1]!.id, root.rootDomain, "/dashboard");
    if (root?.user) return "/new";
    return "/start";
  }, [root, own]);
  const cta = root?.user ? m.landing_cta_dashboard() : m.landing_cta_start();
  const navLinks = links();

  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <header className={cn("sticky z-50 mx-4 flex justify-center transition-all duration-300 md:mx-0", scrolled ? "top-6" : "top-4 mx-0")}>
      <motion.div initial={{ width: "70rem" }} animate={{ width: scrolled ? "800px" : "70rem" }} transition={reduce ? { duration: 0 } : { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }} className="max-w-full">
        <div className={cn("mx-auto max-w-7xl rounded-2xl transition-all duration-300 xl:px-0", scrolled ? "border border-border bg-background/75 px-2 backdrop-blur-lg" : "px-7 shadow-none")}>
          <div className="flex h-[56px] items-center justify-between p-4">
            <Link to="/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              <Logo size={22} />
              openheard
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((n) => (
                <a key={n.label} href={n.href} className="rounded-full px-3 py-1.5 text-[14px] text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground">
                  {n.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-4">
              <Button variant="secondary" size="sm" nativeButton={false} render={ctaHref.startsWith("/") ? <Link to={ctaHref} /> : <a href={ctaHref} />} className="hidden sm:inline-flex">
                {cta}
              </Button>
              <button type="button" onClick={() => setDrawerOpen((o) => !o)} className="flex size-8 cursor-pointer items-center justify-center rounded-md border border-border md:hidden" aria-label={m.landing_nav_menu()}>
                {drawerOpen ? <XIcon className="size-5" /> : <ListIcon className="size-5" />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.2 }} onClick={() => setDrawerOpen(false)} />
            <motion.div className="fixed inset-x-0 bottom-3 z-50 mx-auto w-[95%] rounded-xl border border-border bg-background p-4 shadow-lg" initial={reduce ? { opacity: 0 } : { opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0, transition: reduce ? { duration: 0 } : { type: "spring", damping: 15, stiffness: 200 } }} exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 100, transition: { duration: 0.1 } }}>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <Link to="/" className="flex items-center gap-2.5 text-[15px] font-semibold">
                    <Logo size={26} />
                    openheard
                  </Link>
                  <button type="button" onClick={() => setDrawerOpen(false)} className="cursor-pointer rounded-md border border-border p-1" aria-label={m.landing_nav_close()}>
                    <XIcon className="size-5" />
                  </button>
                </div>
                <ul className="flex flex-col rounded-md border border-border text-sm">
                  {navLinks.map((n) => (
                    <li key={n.label} className="border-b border-border p-2.5 last:border-b-0">
                      <a href={n.href} onClick={(e) => { setDrawerOpen(false); if (!n.href.startsWith("#")) return; e.preventDefault(); document.getElementById(n.href.substring(1))?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); }} className="text-muted-foreground transition-colors hover:text-foreground">
                        {n.label}
                      </a>
                    </li>
                  ))}
                </ul>
                <Button full size="lg" nativeButton={false} render={ctaHref.startsWith("/") ? <Link to={ctaHref} /> : <a href={ctaHref} />}>
                  {cta}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

const agents = [
  ["Claude Code", "claude"],
  ["Cursor", "cursor"],
  ["Codex", "openai"],
  ["ChatGPT", "openai"],
  ["Gemini CLI", "googlegemini"],
] as const;

// Template hero: px-6, radial wash 600/800px tall with rounded-b-xl, pt-32,
// max-w-3xl, gap-10. Then the product shot in px-6 mt-10 rounded-2xl.
// The demo board lives on its own subdomain, so it needs an absolute URL.
// Signs the visitor in as the demo admin. Needs the demo subdomain, so it
// hides on installs without a root domain.
function DemoButton() {
  const root = useLoaderData({ from: "__root__" });
  const href = workspaceUrl(DEMO_WORKSPACE_ID, root?.rootDomain ?? null, "/demo");
  if (href === "/demo") return null;
  return (
    <Button size="lg" variant="secondary" nativeButton={false} render={<a href={href} />}>
      {m.landing_hero_demo()}
    </Button>
  );
}

export function Hero() {
  return (
    <section id="hero" className="relative w-full">
      <div className="relative flex w-full flex-col items-center px-6">
        <div className="absolute inset-0">
          <div className="absolute inset-0 -z-10 h-[600px] w-full rounded-b-xl [background:radial-gradient(125%_125%_at_50%_10%,var(--background)_40%,rgba(110,139,255,.28)_100%)] md:h-[800px]" />
        </div>
        <div className="relative z-10 mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center gap-8 pt-24 md:gap-10 md:pt-32">
          <div className="flex flex-col items-center justify-center gap-5">
            <BlurFade delay={0}>
              <h1 className="text-center text-[28px] font-medium tracking-tighter text-balance sm:text-4xl md:text-5xl lg:text-6xl xl:text-[68px] xl:leading-[1.02]">{m.landing_hero_title()}</h1>
            </BlurFade>
            <BlurFade delay={0.08}>
              <p className="max-w-[54ch] text-center text-base leading-relaxed font-medium tracking-tight text-balance text-muted-foreground md:text-lg">{m.landing_hero_sub()}</p>
            </BlurFade>
          </div>
          <BlurFade delay={0.16}>
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center justify-center gap-3">
                <Button size="lg" arrow nativeButton={false} render={<Link to="/start" />}>
                  {m.landing_hero_start()}
                </Button>
                <DemoButton />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                <span className="text-xs font-medium text-muted-foreground">{m.landing_hero_works_with()}</span>
                {agents.map(([name, mark]) => (
                  <span key={name} className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
                    <span aria-hidden className="size-3.5 shrink-0 bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]" style={{ maskImage: `url(/landing/logos/${mark}.svg)` }} />
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </BlurFade>
        </div>
      </div>
      <BlurFade delay={0.28} className="relative mt-10 px-6">
        <div className="relative size-full overflow-hidden rounded-2xl border border-input bg-card shadow-xl">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-[#2a2a30]" />
            <span className="size-2.5 rounded-full bg-[#2a2a30]" />
            <span className="size-2.5 rounded-full bg-[#2a2a30]" />
            <span className="mx-auto rounded-md bg-background px-3 py-0.5 text-[11px] text-faint">feedback.acme.com</span>
          </div>
          <picture>
            <source srcSet="/landing/board.webp" type="image/webp" />
            <img src="/landing/board.png" alt={m.landing_hero_shot_alt()} width={1920} height={1080} className="block aspect-[4/3] w-full object-cover object-top sm:aspect-[1920/1000]" fetchPriority="high" />
          </picture>
          <BorderBeam size={260} duration={10} colorFrom="#6e8bff" colorTo="#6e8bff00" />
        </div>
      </BlurFade>
      <div className="h-10" />
    </section>
  );
}

const bullets = () => [
  [m.landing_agents_ask_title(), m.landing_agents_ask_text()],
  [m.landing_agents_act_title(), m.landing_agents_act_text()],
  [m.landing_agents_draft_title(), m.landing_agents_draft_text()],
  [m.landing_agents_keys_title(), m.landing_agents_keys_text()],
];

export function Agents() {
  return (
    <Framed id="agents">
      <SectionHeader title={m.landing_agents_title()} sub={m.landing_agents_sub()} />
      <div className="grid md:grid-cols-[380px_1fr]">
        <dl className="flex flex-col gap-6 border-b border-border p-6 md:border-r md:border-b-0">
          {bullets().map(([t, d]) => (
            <div key={t}>
              <dt className="text-[15px] font-medium">{t}</dt>
              <dd className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{d}</dd>
            </div>
          ))}
        </dl>
        <div className="min-w-0 p-6">
          <Terminal title="claude — openheard-mcp" className="min-h-[320px] md:min-h-[400px]">
            <TypingAnimation delay={300}>{`› ${m.landing_agents_term_1()}`}</TypingAnimation>
            <AnimatedSpan delay={2400} className="text-muted-foreground">{`● ${m.landing_agents_term_2()}`}</AnimatedSpan>
            <AnimatedSpan delay={3000} className="pl-4 text-link">{`└ openheard.list_posts status=shipped sort=new ${m.landing_agents_term_3()}`}</AnimatedSpan>
            <AnimatedSpan delay={3500} className="pl-4 text-link">{`└ openheard.draft_changelog ${m.landing_agents_term_4()}`}</AnimatedSpan>
            <AnimatedSpan delay={4100} className="text-muted-foreground">{`● ${m.landing_agents_term_5()}`}</AnimatedSpan>
            <TypingAnimation delay={4800}>{`› ${m.landing_agents_term_6()}`}</TypingAnimation>
            <AnimatedSpan delay={6400} className="pl-4 text-status-shipped">{`└ openheard.publish_changelog ${m.landing_agents_term_7()}`}</AnimatedSpan>
            <AnimatedSpan delay={7000} className="text-muted-foreground">{`● ${m.landing_agents_term_8({ url: "acme.openheard.com/changelog/this-week" })}`}</AnimatedSpan>
          </Terminal>
        </div>
      </div>
    </Framed>
  );
}
