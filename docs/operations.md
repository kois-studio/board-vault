# Operations, environments, and deployment

## Local runtime

Observed local toolchain: Node `v22.20.0`, npm `10.9.3`. The repository currently has installed dependencies in ignored `backend/node_modules/` and `frontend/node_modules/`, but no tracked lockfiles. The backend README says `pnpm`; the verified commands and package metadata use npm. Package-manager choice is unresolved and tracked as EQ-001/DEP-007.

Backend development uses Nest CLI scripts in `backend/package.json`. Frontend development uses Angular CLI scripts in `frontend/package.json`. There is no root command that installs, builds, tests, or coordinates both packages.

## Runtime configuration

The backend reads these variable names from the environment or ignored local `.env`:

- required by `validateEnv.ts`: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`;
- required by provider construction: `RESEND_API_KEY`;
- used by email links/defaults: `NO_REPLY_EMAIL`, `APP_BASE_URL`;
- used by cache: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `UPSTASH_REDIS_REST_DISABLE`.
- used by the staged Clerk backend boundary: `CLERK_SECRET_KEY`, with optional comma-separated `CLERK_AUTHORIZED_PARTIES` for exact frontend origins.

The exact local values are intentionally not documented. No `.env.example`, typed configuration schema, test environment, or production environment ownership record was found. The frontend uses committed environment files containing only public API URLs, a production boolean, the development Clerk publishable key, and a development-only `clerkAuthEnabled` rollout toggle; these values are configuration, not secrets. The Clerk secret must remain backend-only.

## Build, test, and quality baseline

Use the exact commands and current results in [AGENTS.md](AGENTS.md) and [testing.md](testing.md). In summary:

- backend build passes;
- frontend production build passes but reports a Sass `@import` deprecation, 405 skipped selector errors, and an initial bundle over the 500 kB warning budget;
- backend unit tests pass focused profile-update, ownership, group/membership listing, collection route ownership, actor-identity, invitation-lifecycle, invite-only join, notification ownership, meet-read, meet-account-game membership, admin reviewer, password-reset response, global-user-list, deleted-account JWT, database-log, email-log, cache-log, and auth-log suites; broader coverage is still missing;
- backend e2e setup fails because `RESEND_API_KEY` is absent and contains a stale starter assertion;
- backend lint fails with 17 errors and 3 warnings;
- frontend Biome fails with 8 findings;
- frontend browser tests pass one generated app-creation test.
- the Clerk identity migration passes a restored-backup SQLite check and was applied to live Turso with integrity `ok` and unchanged counts of 15 accounts, 13 meets, and 101 meet/game links.
- a local Clerk Google sign-in completed through Board Vault; `/auth/clerk/status` verified the session and linked the matching existing live account `#1`, preserving its admin state. Live Turso now reports one linked account.

## Deployment shape

`backend/vercel.json` configures a Vercel Node build from `src/main.ts` and routes HTTP methods to it. `frontend/src/environments/environment.ts` targets `https://backend.board-vault.com`. The repository does not contain Vercel project metadata, frontend hosting configuration, CI deployment workflow, health probes, migration checks, backup scheduling, or rollback instructions.

Deployment ownership, domain configuration, environment provisioning, provider scopes, and production traffic behavior are therefore unknown and must not be inferred from the committed URLs/config alone.

## Operational risks and next steps

1. Establish locked installation, Node/package-manager support, and a disposable test database.
2. Validate all startup configuration before serving traffic; make optional Redis genuinely optional.
3. Add health/readiness, safe structured request logs, error monitoring, and graceful shutdown checks.
4. Add migration/deployment gates and document Turso backup/restore ownership and rehearsal.
5. Record Vercel/frontend deployment responsibilities and rollback behavior.

## Existing operational notes

[database/operations.md](../database/operations.md) contains Turso CLI dump/drop/restore examples. They are manual operational notes, not a migration or recovery system, and must be reviewed before use against a real database.
