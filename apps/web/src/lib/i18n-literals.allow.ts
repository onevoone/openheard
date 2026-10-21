// Text that is written in code on purpose. i18n-literals.test.ts fails on any
// other readable literal in a component, and on an entry here that no longer
// matches anything (so this list cannot rot).
//
// To add an exception: put the literal, copied exactly as the test prints it,
// under its file (add the file if it is new) with a `why`. If it is something
// a visitor reads, do not add it: write a message in packages/i18n/messages
// instead. Fine here: brand and product names, code and command samples,
// example values, keyboard keys, machine text (API, MCP, webhooks, logs).

// Words that are never translated. A literal made only of these (and of
// punctuation and digits) is fine anywhere: `<span>openheard</span>`.
export const NEUTRAL_WORDS = [
  "openheard",
  "Slack",
  "Discord",
  "Google",
  "Cloudflare",
  "GDPR",
  "JSON",
  "CSV",
  "RSS",
  "MCP",
  "API",
  "Claude",
  "Cursor",
  "Codex",
  "Stripe",
  "OK",
];

export type Allowed = { file: string; why: string; texts: string[] };

export const ALLOWED: Allowed[] = [
  // ---- the marketing page's drawn examples: sample data and terminal output ----
  {
    file: "apps/web/src/components/landing/connect.tsx",
    why: "Sample data in the drawn Slack, Discord and webhook cards: a made-up company, a channel name, a header and initials.",
    texts: ["product-feedback", "o", "x-openheard-signature: t=1767225600,v1=9f2c…", "Acme feedback", "acme.com", "A", "Acme"],
  },
  {
    file: "apps/web/src/components/landing/bottom.tsx",
    why: "Terminal window titles and shell commands in the drawn self-host and agent examples.",
    texts: ["└ openheard.list_posts sort=top status=open", "zsh — ~/openheard", "$ cd packages/infra && bunx alchemy login --configure", "$ bun run deploy", "→ https://openheard.acme.workers.dev", "AGPL-3.0 · ©"],
  },
  {
    file: "apps/web/src/components/landing/top.tsx",
    why: "A sample address and MCP tool calls in the drawn agent window.",
    texts: ["feedback.acme.com", "└ openheard.list_posts status=shipped sort=new {}", "└ openheard.draft_changelog {}", "└ openheard.publish_changelog {}"],
  },
  {
    file: "apps/web/src/components/landing/magic/terminal.tsx",
    why: "A developer-facing assertion in an animation helper; it never reaches a visitor.",
    texts: ["TypingAnimation: children must be a string."],
  },

  // ---- keyboard keys ----
  { file: "apps/web/src/components/footer.tsx", why: "Keyboard shortcut keys.", texts: ["j", "k", "v", "c"] },
  { file: "apps/web/src/components/admin/panel.tsx", why: "Keyboard shortcut.", texts: ["⌘K"] },
  { file: "apps/web/src/routes/help.index.tsx", why: "Keyboard shortcut.", texts: ["⌘K"] },

  // ---- example values in placeholders ----
  {
    file: "apps/web/src/components/auth-form.tsx",
    why: "An example address, the same in every language.",
    texts: ["you@company.com"],
  },
  { file: "apps/web/src/routes/reset-password.tsx", why: "An example address.", texts: ["you@company.com"] },
  { file: "apps/web/src/routes/changelog.tsx", why: "Example address and version number.", texts: ["you@company.com", "v0.4.0"] },
  { file: "apps/web/src/components/workspace-form.tsx", why: "Example website, company name and subdomain.", texts: ["example.com", "Acme", "acme"] },
  { file: "apps/web/src/routes/start.tsx", why: "Example company name, subdomain and website, and the product domain.", texts: ["Acme", "acme", "acme.com", "openheard.com"] },
  { file: "apps/web/src/routes/dashboard/settings/branding.tsx", why: "An example website.", texts: ["yoursite.com"] },
  { file: "apps/web/src/routes/dashboard/settings/team.tsx", why: "An example address.", texts: ["teammate@company.com"] },
  { file: "apps/web/src/routes/dashboard/changelog.tsx", why: "An example version number.", texts: ["v1.0"] },

  // ---- code samples and technical names the dashboard shows ----
  {
    file: "apps/web/src/routes/dashboard/settings/widget.tsx",
    why: "Code samples, attribute names and example origins for the install steps.",
    texts: ["data-openheard-open", 'window.openheard("open")', '<button data-openheard-open="changelog">{}</button>', "https://app.example.com", "https://*.example.com"],
  },
  {
    file: "apps/web/src/routes/dashboard/settings/integrations.tsx",
    why: "The webhook signature header format and a field name, for people who verify signatures.",
    texts: [": t=…,v1=…", "t.body"],
  },
  { file: "apps/web/src/routes/dashboard/help.tsx", why: "A URL path.", texts: ["/help/"] },

  // ---- errors that are not for visitors ----
  {
    file: "apps/web/src/components/widget/context.tsx",
    why: "A developer assertion: a hook used outside its provider.",
    texts: ["useWidget outside the widget"],
  },
  {
    file: "apps/web/src/lib/demo-db.ts",
    why: "Thrown by the demo maintenance scripts (`demo:reset`), read by an operator in a terminal.",
    texts: [
      "BETTER_AUTH_SECRET is required to run the demo workspace",
      "A workspace named {} already exists and needs an explicit migration",
      "Repair cross-workspace references before resetting the demo",
      "Only the demo workspace can be reset",
    ],
  },
  { file: "apps/web/src/lib/demo-seed.ts", why: "Thrown by the seed script, read by an operator.", texts: ["Id {} is already in use by another workspace"] },
  {
    file: "apps/web/src/lib/integration-db.ts",
    why: "Operator and machine text: a missing server secret, and delivery outcomes that are stored with the integration (lastError) in English because no reader's language is known at send time.",
    texts: ["BETTER_AUTH_SECRET is required to store integrations", "Unreadable integration secret", "DNS lookup failed (HTTP {})", "DNS lookup failed"],
  },
  { file: "apps/web/src/lib/safe-fetch.ts", why: "Internal signal, caught and turned into a worded error.", texts: ["dns"] },
  {
    file: "apps/web/src/lib/ops/context.ts",
    why: "Answered to REST API and MCP callers only (a key with no person behind it); those stay English.",
    texts: ["{} needs a person behind the key. Create the key from Settings > API keys while signed in."],
  },
  { file: "packages/auth/src/cloudflare-access.ts", why: "Server log text.", texts: ["Access certs fetch failed: {}"] },
];
