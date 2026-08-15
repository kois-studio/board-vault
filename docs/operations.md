# Operations, environments, and deployment

## Local runtime

Observed local toolchain: Node `v22.20.0`, npm `10.9.3`. The repository currently has installed dependencies in ignored `backend/node_modules/` and `frontend/node_modules/`, but no tracked lockfiles. The backend README says `pnpm`; the verified commands and package metadata use npm. Package-manager choice is unresolved and tracked as EQ-001/DEP-007.

Backend development uses Nest CLI scripts in `backend/package.json`. Frontend development uses Angular CLI scripts in `frontend/package.json`. There is no root command that installs, builds, tests, or coordinates both packages.

## Runtime configuration

The backend reads these variable names from the environment or ignored local `.env`:

- required by `validateEnv.ts`: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`;
- required by provider construction: `RESEND_API_KEY`;
- used by email links/defaults: `NO_REPLY_EMAIL`, `APP_BASE_URL`;
- used by cache and authentication rate limiting: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `UPSTASH_REDIS_REST_DISABLE`; Redis credentials are required unless the disable flag is exactly `true`.
- used by CORS: optional comma-separated `CORS_ORIGINS` additions; production defaults only to `https://board-vault.com`, development also allows `http://localhost:4200` and `http://127.0.0.1:4200`, and wildcard `*` is ignored.
- used by the Clerk backend boundary: `CLERK_SECRET_KEY`; production also requires comma-separated `CLERK_AUTHORIZED_PARTIES` containing only exact frontend origins such as `https://board-vault.com`.
- used by the frontend production build: public `CLERK_PUBLISHABLE_KEY`; optional `CLERK_AUTH_ENABLED=false` can explicitly keep the Clerk controls disabled.

The API accepts JSON and URL-encoded request bodies up to 100 KB. This is configured in `backend/src/main.ts`; multipart uploads are not an evidenced supported interface.

The exact local values are intentionally not documented. No `.env.example`, typed configuration schema, test environment, or production environment ownership record was found. The frontend uses committed environment files containing only public API URLs, a production boolean, and the development Clerk publishable key. Production builds generate an ignored `public/runtime-config.js` from the public `CLERK_PUBLISHABLE_KEY` build variable; the production toggle/key remain disabled until the production Clerk instance is configured. These values are configuration, not secrets. The Clerk secret must remain backend-only.

When `NODE_ENV=production`, startup fails closed unless `CLERK_SECRET_KEY` and `CLERK_AUTHORIZED_PARTIES` are present. This prevents a deployment from accepting Clerk sessions without an explicit trusted frontend-origin policy.

## Build, test, and quality baseline

Use the exact commands and current results in [AGENTS.md](AGENTS.md) and [testing.md](testing.md). In summary:

- backend build passes;
- frontend production build passes but reports a Sass `@import` deprecation, 405 skipped selector errors, and an initial bundle over the 500 kB warning budget;
- backend unit tests pass focused profile-update, ownership, group/membership listing, collection route ownership, actor-identity, invitation-lifecycle, invite-only join, notification ownership, meet-read, meet-account-game membership, admin reviewer, authentication path/query validation, global-user-list, deleted-account JWT, database-log, email-log, cache-log, and auth-log suites; broader coverage is still missing;
- backend e2e setup fails because `RESEND_API_KEY` is absent and contains a stale starter assertion;
- backend lint fails with 17 errors and 3 warnings;
- frontend Biome fails with 8 findings;
- frontend browser tests pass one generated app-creation test.
- the Clerk identity migration passes a restored-backup SQLite check and was applied to live Turso with integrity `ok` and unchanged counts of 15 accounts, 13 meets, and 101 meet/game links.
- a local Clerk Google sign-in completed through Board Vault; `/auth/clerk/status` verified the session and linked the matching existing live account `#1`, preserving its admin state. Live Turso now reports one linked account. Protected-route Clerk transport and new-account provisioning are covered by focused backend tests but not yet by a deployed production check.

## Deployment shape

`backend/vercel.json` configures a Vercel Node build from `src/main.ts` and routes HTTP methods to it. `frontend/src/environments/environment.ts` targets `https://backend.board-vault.com`. The repository does not contain Vercel project metadata, frontend hosting configuration, CI deployment workflow, health probes, migration checks, backup scheduling, or rollback instructions.

External smoke checks on 2026-08-15 first observed the old backend deployment
(HTTP 404 for `/auth/clerk/status`), then observed the new fail-closed backend
returning Vercel `FUNCTION_INVOCATION_FAILED` until its production variables
were configured. The production Clerk instance is now present with Clerk
domain `board-vault.com`, frontend API `https://clerk.board-vault.com`, and
accounts portal `https://accounts.board-vault.com`; its required DNS records
are managed by Vercel and verified by Clerk. SSL provisioning remains in
progress at the time of this update.

Vercel Production variables are now configured in the separate projects:
`board-vault-front` has `CLERK_PUBLISHABLE_KEY` and `CLERK_AUTH_ENABLED`, while
`board-vault-back` has sensitive `CLERK_SECRET_KEY` and
`CLERK_AUTHORIZED_PARTIES=https://board-vault.com`. A fresh deployment is
required before live behavior can be rechecked; production Clerk readiness
cannot be claimed until that deployment serves the route and the frontend is
built with the production publishable key.

Deployment ownership, domain configuration, environment provisioning, provider scopes, and production traffic behavior are therefore unknown and must not be inferred from the committed URLs/config alone.

## Operational risks and next steps

1. Establish locked installation, Node/package-manager support, and a disposable test database.
2. Keep Redis explicitly disabled only in local environments; production rate limiting requires valid Upstash credentials.
3. Add health/readiness, safe structured request logs, error monitoring, and graceful shutdown checks.
4. Add migration/deployment gates and document Turso backup/restore ownership and rehearsal.
5. Record Vercel/frontend deployment responsibilities and rollback behavior.

## Existing operational notes

[database/operations.md](../database/operations.md) contains Turso CLI dump/drop/restore examples. They are manual operational notes, not a migration or recovery system, and must be reviewed before use against a real database.
