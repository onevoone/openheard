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
