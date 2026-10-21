# Contributing

## Run it locally

```bash
bun install
bun run db:push:local   # creates apps/web/local.db
bun run dev:local       # http://localhost:3001
```

Sign up once (the first account becomes admin), then `bun run db:seed` for
demo posts.

## Text and translations

Interface text lives in `packages/i18n/messages/{uk,en}.json` (Ukrainian is the
base locale, English the second) and is compiled to typed functions: `m.nav_board()`.
`bun run i18n:compile` generates them; `check-types` and `test` do it for you,
`vite dev` recompiles on every edit. Keys are flat `snake_case`, sorted, and
present in both files with the same `{placeholders}`; `bun run test` checks that.
Call `m.*()` while rendering, never at module load. The language of a request is
chosen in `apps/web/src/lib/locale.ts`: visitor cookie, `Accept-Language`, the
workspace's board language, then Ukrainian.

- **Plurals.** Counts are messages with variants, never `n === 1 ? "" : "s"`:
  `declarations: ["input count", "local countPlural = count: plural"]`, with
  `one/few/many/other` for Ukrainian and `one/other` for English. A test fails
  when a language misses a category. Short forms that do not inflect ("2 дн.",
  "3d") need no plural.
- **Never inflect user data inside a sentence.** A post title, board, tag,
  workspace or person's name is dropped into a message as it is, so write the
  sentence so that the name stays in the nominative or in quotes: «Статус
  «{title}» змінено: {status}», not "{title} тепер Заплановано". Put the name
  in the text before or after a colon, never in a case-governed spot such as
  "в {workspace}".
- **Errors** are `err_*` keys, worded at the moment they are thrown, inside the
  request, so they follow the visitor's language: `throw new Error(m.err_sign_in_required())`.
  An op in `lib/ops` takes its language from `ctx.locale` (`m.err_x(params, { locale: ctx.locale })`):
  the dashboard passes the request's language, the REST API and MCP pass `"en"`
  and stay English. zod messages are lazy, `{ error: () => m.err_x() }`; no
  text is built when a module loads.
- **Dates and numbers** go through `lib/format.ts` (`formatNumber`, `formatDate`,
  `formatShortDate`) and relative times through `ago()` / `since()` in
  `lib/time.ts`. Never write `"en-US"`. Code that runs outside a request (emails)
  passes `{ locale }`.
- **Defaults are data.** The statuses, board and tagline a new workspace starts
  with come from `defaultStatuses(locale)`, `defaultBoard(locale)` and
  `defaultTagline(locale)` in `packages/db/src/defaults.ts` and are written
  to the database in the workspace's language; they are not translated on read.
  The demo workspace stays English.
- **Shared components.** `packages/ui` depends on `@openheard/i18n` for the few
  words it renders itself (the dialog's close label, copy and loading button
  states, the message scroller). Those are `ui_*` keys read at render time as
  default props, so a caller can still pass its own label.
- **Sentences around a link or bold part** are split into `_before`, `_link` and
  `_after` messages; a count that sits in a sentence is a plural message.
- **Alerts and other text sent outside a request** (Slack and Discord messages,
  emails) are worded in the workspace's language, passed on every call:
  `m.integration_headline_post_created({}, { locale: event.locale })`. Never
  read `getLocale()` there. What a delivery stores about itself (`lastError`:
  "HTTP 404", "Timed out after 5s") stays English: no reader's language is
  known when it is written.
- **Notes the app writes into the database** (the timeline's merge, release and
  pin notes) store English text in `note`, which the REST API and MCP return
  as it is, and a JSON `noteData` that `activityNote()` words in the reader's
  language. A new kind of note needs a code in `lib/activity-note.ts` and a message.
- **Errors from better-auth** are worded by `authErrorMessage()` from their
  `code`; an unknown code falls back to better-auth's own English message.
- **Relative times** (`ago()`, `since()`) differ by a second between the server
  and the browser, so the element that shows one carries `suppressHydrationWarning`.
- **Not translated:** the REST API, MCP, CSV export and the generic webhook,
  the prompt pasted into an AI coding agent (in Settings → API keys), and
  anything the team typed (statuses, boards, tags, posts). Brand names, code
  samples and example values in placeholders are written as they are.
- **No new literals.** `apps/web/src/lib/i18n-literals.test.ts` parses every
  component and fails on readable text written in code: JSX text, `placeholder`,
  `aria-label`, `title`, `alt`, `label`, `toast.*()`, `confirm()` and
  `new Error("...")`. Fix it with a message. If the text really is not for a
  reader (a brand, a code sample, an example value, machine output), add it
  under its file in `apps/web/src/lib/i18n-literals.allow.ts` with a reason; the
  test also fails on an entry that no longer matches, so the list stays honest.
  It does not see text in plain objects (`{ label: "Board" }`), so keep those
  as `() => m.nav_board()`.

### Ukrainian glossary and tone

Address the reader formally («ви»). Keep these terms, they are the product's
vocabulary:

| English | Ukrainian |
| --- | --- |
| post, idea | ідея |
| board | дошка |
| workspace | простір |
| roadmap | дорожня карта |
| changelog | журнал змін |
| dashboard | панель керування |
| help center, article | довідка, стаття довідки |
| widget | віджет |
| vote | голос, проголосувати |
| comment | коментар |
| tag | тег |
| status | статус |
| Pending | Очікує |
| Under review | На розгляді |
| Planned | Заплановано |
| In progress | У роботі |
| Shipped | Випущено |
| Closed | Закрито |

Keep it short and plain. Brand and protocol names (openheard, Slack, Discord,
Stripe, URL, hex) stay in Latin letters.

## Before you open a PR

- `bun run --filter web check-types` passes.
- Follow `DESIGN.md`. Geist, Phosphor, one button component, three radii.
- One change per PR, described in one line.
- No AI attribution in commits or PR descriptions.

## Where things live

- `apps/web/src/routes` pages, `admin/` is the dashboard
- `apps/web/src/functions` server functions
- `packages/db/src/schema` tables, `migrations/` generated with `bun run db:generate`
- `packages/ui/src/components` shadcn-style components on Base UI
