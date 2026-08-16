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
- production Clerk sign-up policy: verified email, password, and username are required; Google OAuth is currently disabled and can be re-enabled later through the Clerk instance configuration.

The API accepts JSON and URL-encoded request bodies up to 100 KB. This is configured in `backend/src/main.ts`; multipart uploads are not an evidenced supported interface.

The exact local values are intentionally not documented. No `.env.example`, typed configuration schema, test environment, or production environment ownership record was found. The frontend uses committed environment files containing only public API URLs, a production boolean, and the development Clerk publishable key. Production builds generate an ignored `public/runtime-config.js` from the public `CLERK_PUBLISHABLE_KEY` build variable; the production Clerk toggle/key are configured in Vercel as documented in the deployment section below. These values are configuration, not secrets. The Clerk secret must remain backend-only.

When `NODE_ENV=production`, startup fails closed unless `CLERK_SECRET_KEY` and `CLERK_AUTHORIZED_PARTIES` are present. This prevents a deployment from accepting Clerk sessions without an explicit trusted frontend-origin policy.

## Build, test, and quality baseline

Use the exact commands and current results in [AGENTS.md](AGENTS.md) and [testing.md](testing.md). In summary:

- backend build passes;
- frontend production build passes but reports a Sass `@import` deprecation, 412 skipped selector errors, and an initial bundle over the 500 kB warning budget;
- backend unit tests pass focused profile-update, ownership, group/membership listing, collection route ownership, actor-identity, invitation-lifecycle, invite-only join, notification ownership, meet-read, meet-account-game membership, admin reviewer, authentication path/query validation, global-user-list, deleted-account JWT, database-log, email-log, cache-log, and auth-log suites; broader coverage is still missing;
- backend HTTP e2e now passes two environment-safe boundary tests; broader seeded/integration coverage remains open;
- backend lint fails with 17 errors and 3 warnings;
- frontend Biome passes for `src/app` with no diagnostics;
- frontend unit/browser baseline includes one generated Angular smoke test and three passing Playwright public-navigation tests; the authenticated Playwright journeys exist but remain opt-in and were skipped without a disposable Clerk storage state.
- the Clerk identity migration passes a restored-backup SQLite check and was applied to live Turso with integrity `ok` and unchanged counts of 15 accounts, 13 meets, and 101 meet/game links.
- a local Clerk sign-in completed through Board Vault during development; `/auth/clerk/status` verified the session and linked the matching existing live account `#1`, preserving its admin state. Production currently uses email/password/username only; Google OAuth is intentionally disabled. Protected-route Clerk transport and new-account provisioning are covered by focused backend tests but not yet by a deployed production check.
- On 2026-08-15, a production email/password/username signup for the preserved
  account email completed through Board Vault. The backend migrated Account
  `#1` from the development Clerk identity to production identity
  `user_3HxXASrQGVtKs0Cg2CGzfxmjeMS`; the header link warning disappeared and a
  read-only Turso check confirmed the production Clerk ID on the account.
- On 2026-08-16, migration `0002-add-auth-token-expiry.sql` was applied to live
  Turso after a fresh local dump. Integrity and foreign-key checks passed, the
  two expiry columns were present, the preserved aggregate counts remained 16
  accounts, 13 meets, and 101 meet/game links, and the committed schema export
  was updated. No token values were printed or committed.
- Also on 2026-08-16, migration `0003-add-session-relations.sql` was applied to
  live Turso after a fresh local dump. It created `MeetAttendee` and `MeetGame`,
  backfilled 63 attendee rows and 22 session-game rows from the preserved 101
  `MeetAccountGame` links, and passed integrity/foreign-key checks. The backend
  detail/setup SQL was aligned and deployment boundary checks passed.

- On 2026-08-16, migration `0004-add-session-lifecycle.sql` was applied to live
  Turso after a fresh local dump and a disposable SQLite check. It added
  `Meet.status`, `Meet.timezone`, nullable `Meet.updatedAt`, and the lifecycle
  index. Integrity and foreign-key checks passed; preserved counts remained 16
  accounts, 13 meets, 101 meet/game links, 63 attendees, and 22 session games.
  The first attempt exposed SQLite's restriction on non-constant defaults in
  `ALTER TABLE`; the migration was corrected to keep `updatedAt` nullable and
  the application writes it explicitly.

- On 2026-08-16, migration `0005-add-recommendation-feedback.sql` was applied
  to live Turso after a disposable SQLite check and a fresh local backup. It
  created `RecommendationFeedback` and its group/date index; integrity and
  foreign-key checks passed and the initial feedback row count was zero. The
  backup remains local and uncommitted.
- On 2026-08-16, the live Turso database received the additive `SchemaMigrations`
  metadata table and markers for migrations `0001` through `0005`. The committed
  migration runner and empty-state verification now reproduce this metadata
  safely; CI/deployment integration and a synthetic restore rehearsal remain
  open.

The resulting backend deployment was promoted to production on 2026-08-16.
Unauthenticated `GET /auth/clerk/status` returned 401, validation on
`GET /auth/check-email` returned 400, and unauthenticated meet details returned
401; all three responses included `Access-Control-Allow-Origin:
https://board-vault.com`. An authenticated meet-detail/selection smoke test is
still pending; the attendee-write policy is now organizer-only and covered by
backend authorization tests, but has not yet been exercised through production
with a preserved account.

## Deployment shape

`backend/vercel.json` configures a Vercel Node build from `src/main.ts` and routes HTTP methods to it. `frontend/src/environments/environment.ts` targets `https://backend.board-vault.com`. The repository contains `.github/workflows/ci.yml` for locked installs, backend tests/build, frontend build/public browser checks, and disposable database verification. It does not deploy, run authenticated production checks, schedule backups, or provide rollback instructions.

External smoke checks on 2026-08-15 first observed the old backend deployment
(HTTP 404 for `/auth/clerk/status`), then observed the new fail-closed backend
returning Vercel `FUNCTION_INVOCATION_FAILED` until its production variables
were configured. The production Clerk instance is now present with Clerk
domain `board-vault.com`, frontend API `https://clerk.board-vault.com`, and
accounts portal `https://accounts.board-vault.com`; its required DNS records
are managed by Vercel and verified by Clerk, and Clerk reports the production
domain and SSL setup as complete.

Vercel Production variables are now configured in the separate projects:
`board-vault-front` has `CLERK_PUBLISHABLE_KEY` and `CLERK_AUTH_ENABLED`, while
`board-vault-back` has sensitive `CLERK_SECRET_KEY` and
`CLERK_AUTHORIZED_PARTIES=https://board-vault.com`. The fresh deployment is
live: the frontend returns HTTP 200 and exposes an enabled production runtime
configuration, while the unauthenticated backend Clerk status route returns
HTTP 401 with `Access-Control-Allow-Origin: https://board-vault.com` rather
than a wildcard. An authenticated production signup/sign-in was completed
with email, password, and username, and the matching preserved local account
was linked to its production Clerk identity. Google OAuth remains intentionally
disabled.

On 2026-08-15, an authenticated request to
`/collection/users/1/games` returned a Vercel 504 because the configured
Upstash Redis hostname failed DNS resolution. The browser reported this as a
CORS error because the generated 504 did not include the API CORS header;
direct origin checks against the backend returned the expected allow-origin
header. Cache operations now use a 250 ms deadline, no SDK retries, and a
30-second failure cooldown so a Redis outage cannot consume the Vercel
invocation. Before the replacement database was configured, the limiter
intentionally failed open when Redis was unavailable; the fail-fast
containment remains in place as a provider-outage safeguard.

On 2026-08-16, the production authenticated browser smoke test was repeated
after deployment `736b11f`: Board Vault loaded successfully and the collection
data loaded without the previous 504/CORS symptom. This verifies the
application-side Redis failure containment.

Also on 2026-08-16, the production backend was redeployed with a newly
provisioned Upstash Redis database. A read-only cache probe returned HTTP 200
and Vercel logged `REDIS: Found 0 keys!`; the rate-limited authentication route
also returned its expected validation response with the production CORS
header. Production Redis connectivity and rate-limit storage are now
operational. The old invalid endpoint is no longer used.

Deployment ownership, domain configuration, environment provisioning, provider scopes, and production traffic behavior are therefore unknown and must not be inferred from the committed URLs/config alone.

## Operational risks and next steps

1. Establish locked installation, Node/package-manager support, and a disposable test database.
2. Monitor the production Upstash quota and keep Redis explicitly disabled only in local environments.
3. Add health/readiness, safe structured request logs, error monitoring, and graceful shutdown checks.
4. Add migration/deployment gates and document Turso backup/restore ownership and rehearsal. Migration 0004 is manually verified and live, but there is still no repeatable runner.
5. Record Vercel/frontend deployment responsibilities and rollback behavior.

## Existing operational notes

[database/operations.md](../database/operations.md) contains Turso CLI dump/drop/restore examples. They are manual operational notes, not a migration or recovery system, and must be reviewed before use against a real database.
