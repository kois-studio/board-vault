# Board Vault agent instructions

Board Vault is a group-centered board-game companion: an Angular app
(`frontend/`), a NestJS API (`backend/`), and a libSQL/SQLite database
(`database/`). Sign-in is Clerk-only. Production runs on Vercel, Turso, Clerk,
and Upstash.

## Routing: doing X? read Y

| Task | Read first |
| --- | --- |
| Set up a machine or run the app | [onboarding.md](onboarding.md) |
| Find where something lives | [architecture.md](architecture.md) |
| Add or change an API route or DTO | [how-to/add-endpoint.md](how-to/add-endpoint.md), [api.md](api.md) |
| Change the database schema | [how-to/add-migration.md](how-to/add-migration.md), [data-model.md](data-model.md) |
| Add a page or change a frontend flow | [how-to/add-page.md](how-to/add-page.md), [design-system.md](design-system.md), [ux-flows.md](ux-flows.md) |
| Add a button or a button-like link | [design-system.md#buttons-and-links](design-system.md#buttons-and-links) (`appButton` on a native `<button>` or `<a>`) |
| Pick a colour, or style light and dark mode | [design-system.md#colour-the-ciruela-palette](design-system.md#colour-the-ciruela-palette) (`bv-*` tokens only, no Tailwind palette colours) |
| Explain a feature with a (?), add a wishlist heart, a toggle chip, or offer Undo | [design-system.md#shared-controls](design-system.md#shared-controls) (`<app-info-popover>`, `<app-wishlist-toggle>`, `.app-chip`, toast actions) |
| Touch sign-in, sessions, or account resolution | [authentication.md](authentication.md), [ADR-0012](adr/0012-clerk-only-authentication.md) |
| Sign in locally or run Clerk browser tests | [how-to/run-with-clerk.md](how-to/run-with-clerk.md) |
| Add or read an environment variable | [environments.md](environments.md) |
| Run with local Redis | [how-to/run-with-redis.md](how-to/run-with-redis.md) |
| Update Playwright screenshots | [how-to/update-screenshots.md](how-to/update-screenshots.md) |
| Make a durable decision | [adr/README.md](adr/README.md) |
| Pick up or file work | [GitHub Issues](https://github.com/kois-studio/board-vault/issues) (`gh issue list`) |

Product terms are in [glossary.md](glossary.md). Product boundaries live in the
private `kois-context` repository when you have access; it is never needed to
run the app.

## Hard rules

1. **No secrets or real data in Git.** Never stage `.env` files, database
   files, dumps, browser storage state, or `frontend/public/runtime-config.js`.
   `npm run check:public-tree` enforces the file patterns.
2. **Never use production credentials or data** for development or tests. Use
   the local SQLite database and the development Clerk instance
   (`pk_test_`/`sk_test_` keys, `+clerk_test` accounts).
3. **The shared Turso development database is not a scratch database.** Do not
   reset or refresh it; that is an owner operation.
4. **Never delete `Account` rows or drop the `Account` table.** Almost every
   table cascades from it (see [data-model.md](data-model.md)). Accounts are
   soft-deleted with `isDeleted`.
5. **Migrations are additive and numbered.** Never edit an applied migration.
   Assign the number when you integrate with `main`.
6. **The backend is the security boundary.** Derive the acting account from
   `request.user`, authorize the target object server-side, and never trust
   client-supplied owner IDs or Clerk claims for authorization.
7. **Keep the API contract in sync.** Regenerate `docs/api/openapi.json` after
   any route or DTO change; CI fails on a stale snapshot.
8. **Update the docs you invalidate.** Changing code, configuration, or
   operations means updating the matching page here; durable architecture,
   security, data, identity, or privacy decisions need an ADR.

## Workflow

- Contributors work in a focused branch or Git worktree and open a PR to
  `main`. GitHub requires the four CI jobs and one approval (CODEOWNERS).
- Owner-directed maintenance may commit directly to `main`. An administrative
  bypass of a review or check is not evidence that it passed; report it.
- Each issue should fit one PR. Reference it in the PR (`Closes #123`).
- Local config and database state belong to the worktree that owns them.

## Checks

Package manifests are the source of truth. From the repository root:

```shell
npm run lint              # backend eslint + frontend biome
npm run test:unit         # backend and frontend Vitest
npm run build
npm run test:e2e          # backend e2e + Playwright public journeys
npm run verify:migrations # empty-database migration chain
npm run verify:restore    # restore + migrate rehearsal
npm run verify:rollback   # rollback rehearsal
npm run check:docs        # local links + Node version consistency
```

Run the checks for the packages and boundaries you changed. Report failed or
skipped checks honestly.

## Documentation map

Current-state docs describe the code as it is: [architecture](architecture.md),
[data model](data-model.md), [authentication](authentication.md),
[API](api.md), [environments](environments.md). ADRs record why. The
[standards contract](project-standards.yml) records the rule-by-rule
assessment against the shared engineering standards; deferred rules link to
their issues. Add new pages to [README.md](README.md).
