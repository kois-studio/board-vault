# Operations, environments, and deployment

## Local runtime

Observed local toolchain: Node `v22.20.0`, npm `10.9.3`. The repository has tracked root, backend, and frontend package-lock files; installed dependencies are present in ignored `node_modules/` directories. Both package READMEs and verified commands use npm. The dependency-free root package exposes convenience wrappers for installation, build, unit tests, E2E tests, and migration verification; its lint wrapper calls package-local no-mutation `lint:check` scripts, while backend’s separate `lint` script still writes fixes and should not be used casually.

Backend development uses Nest CLI scripts in `backend/package.json`. Frontend development uses Angular CLI scripts in `frontend/package.json`. There is no root command that installs, builds, tests, or coordinates both packages.

## Runtime configuration

The backend reads these variable names from the environment or ignored local `.env`:

- required by `validateEnv.ts`: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`;
- required by provider construction: `RESEND_API_KEY`;
- used by email links/defaults: `NO_REPLY_EMAIL`, `APP_BASE_URL`;
- used by cache and authentication rate limiting: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `UPSTASH_REDIS_REST_DISABLE`; Redis credentials are required unless the disable flag is exactly `true`.
- used by CORS: optional comma-separated `CORS_ORIGINS` additions; production defaults only to `https://board-vault.com`, development also allows Angular's `4200` origin and the isolated Playwright/frontend `4300` origin on localhost and `127.0.0.1`, and wildcard `*` is ignored.
- used by the Clerk backend boundary: `CLERK_SECRET_KEY`; production also requires comma-separated `CLERK_AUTHORIZED_PARTIES` containing only exact frontend origins such as `https://board-vault.com`.
- used by the frontend production build: public `CLERK_PUBLISHABLE_KEY`; optional `CLERK_AUTH_ENABLED=false` can explicitly keep the Clerk controls disabled.
- development authenticated browser testing: the linked Clerk CLI may use `clerk impersonate <development-user-id> --instance dev --print --yes` to create a temporary developer-issued sign-in URL; this is for disposable development identities only and must never target production users or be committed as a token. The complete storage-state workflow is documented in [`docs/testing.md`](testing.md).
- used by the registration boundary: optional `BOARD_VAULT_SELF_REGISTRATION_ENABLED`; production defaults to closed unless this is explicitly `true`, while development/test default to open.
- used by private-beta group email invitations: `BOARD_VAULT_CLERK_INVITATION_REDIRECT_URL`; production must set this to the exact public `/register` URL that Clerk invitation emails should return to. Local development defaults to `http://localhost:4200/register`; the isolated port-4300 browser workflow must override it to `http://localhost:4300/register` before creating provider invitations.
- production Clerk sign-up policy: Clerk is configured with restricted sign-up mode, so public self-registration is disabled while sign-in remains available. The backend mirror policy uses `BOARD_VAULT_SELF_REGISTRATION_ENABLED`; leave it unset or false in production, and set it to true only for an intentional public-registration launch. Verified email, password, and username remain required when sign-up is enabled; Google OAuth is currently disabled.
- unverified-account retention: the default policy is 60 days for legacy accounts that have not verified email, have no Clerk identity, and have no domain records. Run `node database/scripts/prune-unverified-accounts.mjs` for a read-only dry run; review the candidate IDs, then add `--apply` only when the soft-delete is intentional. Set `UNVERIFIED_ACCOUNT_RETENTION_DAYS` to change the threshold. The tool never hard-deletes accounts and skips any account with collection, group, invitation, session, review, notification, proposal, recommendation, owned-game, or wishlist history.

The API accepts JSON and URL-encoded request bodies up to 100 KB. This is configured in `backend/src/main.ts`; multipart uploads are not an evidenced supported interface.

The exact local values are intentionally not documented. The committed `backend/.env.example` documents variable names and safe local defaults; a typed configuration schema, test environment, and production environment ownership record remain open. The frontend uses committed environment files containing only public API URLs, a production boolean, and the development Clerk publishable key. Production builds generate an ignored `public/runtime-config.js` from the public `CLERK_PUBLISHABLE_KEY` build variable; the production Clerk toggle/key are configured in Vercel as documented in the deployment section below. These values are configuration, not secrets. The Clerk secret must remain backend-only.

When `NODE_ENV=production`, startup fails closed unless `CLERK_SECRET_KEY` and `CLERK_AUTHORIZED_PARTIES` are present. This prevents a deployment from accepting Clerk sessions without an explicit trusted frontend-origin policy.

## Build, test, and quality baseline

Use the exact commands and current results in [AGENTS.md](AGENTS.md) and [testing.md](testing.md). In summary:

- backend build passes;
- frontend production build passes without Sass or selector warnings; route-level components are lazy-loaded and the initial raw bundle is 606.76 kB (138.37 kB estimated transfer), below the 650 kB warning budget. Clerk remains a separate 1.55 MB lazy chunk;
- backend unit tests pass 46 suites and 234 tests, including profile-update, ownership, group/membership listing, collection route ownership, actor-identity, invitation visibility/lifecycle/expiry/atomic acceptance, owner-only legacy invitation creation, provider invitation listing/revocation boundaries, soft-deleted account exclusion, verified-user gating, deprecated-route removal, Clerk group invitations, invite-only join, notification ownership, meet-read, meet-account-game membership and per-game ownership validation, service-level session participation invariants, organizer lifecycle transition rules, group acquisition ownership-race protection and owner decisions, admin reviewer, route-parameter, bounded list-query, request-size, and bounded social free-text validation, self-profile response privacy, cache maintenance endpoint protection, safe API error normalization, health/readiness probes, authentication path/query validation, global-user-list, deleted-account JWT, database-log, email-log, cache-log, auth-log, non-destructive cache-diagnostic, and canonical session-read suites; broader coverage is still missing;
- backend HTTP e2e now passes two environment-safe boundary tests; broader seeded/integration coverage remains open;
- the bootstrap installs a global strict `ValidationPipe` in addition to targeted controller pipes, so new DTO routes fail closed on unknown fields; request DTOs now bound the highest-risk free-text and bulk-array inputs, while client negative tests and a complete legacy DTO inventory remain open;
- backend lint passes with no errors or warnings; the CI workflow now runs the
  no-mutation lint command explicitly;
- frontend Biome passes for `src/app` with no diagnostics;
- frontend unit/browser baseline includes 36 passing browser-based unit tests (including private collection-boundary and activation guidance, invitation-decline confirmation, pending Clerk invitation contracts, schedule handoff/submission, session participant safeguards, group-history attendee summaries, upcoming-session social context labels, recommendation history context, attendee controls, and decision-lens semantics, accessible theme-control labels, self-profile, session lifecycle, acquisition-board and recommendation-lens contracts, provider invitation rejection, false-success rejection, administrator pagination, notification, group-creation handoff, protected-route account-readiness, and API response-contract validation), a 606.76 kB initial / 138.37 kB estimated-transfer production build, and four passing Playwright public-navigation tests, including the Clerk invitation-ticket registration path; the authenticated Playwright journeys exist but remain opt-in and were skipped without a disposable Clerk storage state.
- the Clerk identity migration passes a restored-backup SQLite check and was applied to live Turso with integrity `ok` and unchanged counts of 15 accounts, 13 meets, and 101 meet/game links.
- a local Clerk sign-in completed through Board Vault during development; `/auth/clerk/status` verified the session and linked the matching existing live account `#1`, preserving its admin state. Production currently uses email/password/username only; Google OAuth is intentionally disabled. Protected-route Clerk transport and new-account provisioning are covered by focused backend tests but not yet by a deployed production check.
- On 2026-09-06, the linked development Clerk provider invitation flow was exercised against disposable local data: create, awaited pending-list visibility, revoke, and post-refresh removal all passed. The custom ticket registration flow now collects Clerk's configured username/password requirements, mounts the required CAPTCHA target, activates the resulting session, and reaches the local dashboard. That acceptance rehearsal used a valid-format disposable address with `notify:false` and temporarily disabled Smart CAPTCHA only on the development instance; CAPTCHA was restored and verified enabled. The route contract accepts real `inv_...` identifiers; human CAPTCHA, provider delivery, expiry, and failure/retry evidence remain open and no production invitation or deployment was touched.
- The five-game collection rehearsal is local-only: `database/scripts/seed-collection-activation-fixture.mjs` refuses non-`file:` database URLs, seeds five clearly named test catalog entries, and is paired with the opt-in Playwright activation journey. Never point it at Turso production.
- On 2026-09-06, a read-only `turso db export board-vault` produced a local snapshot with `PRAGMA integrity_check = ok` and no foreign-key violations. Applying pending migrations 0006–0009 to that copy reached 0009 cleanly while preserving 16 accounts, 13 sessions, 22 session-game links, and 5 groups. This is release evidence, not a scheduled backup or permission to apply the migrations to live Turso.
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

`backend/vercel.json` configures a Vercel Node build from `src/main.ts` and routes HTTP methods to it. `frontend/src/environments/environment.ts` targets `https://backend.board-vault.com`. The repository contains `.github/workflows/ci.yml` for locked installs, backend tests/build, frontend build/public browser checks, disposable database verification, and a synthetic backup/restore rehearsal. It does not deploy, run authenticated production checks, schedule backups, or provide rollback instructions.

CI quality gates now include the no-mutation backend ESLint command and the
frontend Biome check in addition to builds, tests, browser checks, and migration
verification. The first remote workflow execution is still pending.

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
disabled. On 2026-09-03, Clerk production was changed from public to
restricted sign-up mode. The application code also defaults self-registration
off in production, updates the public auth copy to private-beta language,
preserves the legacy sign-in fallback for migration, and rejects unverified
legacy logins. Local application code now also supports owner-created Clerk
email invitations with a ticketed registration flow and automatic membership
handoff after verified identity resolution. The Clerk configuration and both backend/frontend deployment
variables must remain aligned before changing the product to public
registration.

A read-only Turso check on 2026-09-04 found three active legacy accounts that
were not recognized as friends. Account `#14` is verified and has one owned
game, one group membership, and collection activity; account `#15` is verified
but has no domain history; account `#16` is unverified, has no domain history,
and is younger than the 60-day cleanup threshold. None has a Clerk identity,
and none was deleted or contacted. See [ADR-0008](adr/0008-private-beta-registration.md)
for the retention and notification policy.

A follow-up aggregate check on 2026-09-06 found four active unverified legacy
accounts. Accounts `#4`, `#7`, and `#9` already have group or owned-game
history, so the retention tool correctly excludes them; account `#16` remains
history-free but is still younger than the 60-day threshold. The cleanup
candidate count is zero. No account was deleted or contacted. The linked Clerk
CLI has no production instance configured, so production Clerk sign-up settings
were verified read-only through the exact production instance ID: sign-up mode
is `restricted`, email/username/password are required, the password minimum is
15 characters, email verification is enabled, and Smart CAPTCHA is enabled.
No production setting was changed.

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
Diagnostic key inspection is non-destructive: if key enumeration fails, the
endpoint returns an empty diagnostic result and never flushes Redis or
rate-limit state.

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

On 2026-09-03, migrations `0006-add-group-game-interest.sql` and
`0007-add-meet-notes.sql` were added to the local release work for the group
acquisition board and session context. On 2026-09-04, migration
`0008-add-invitation-expiry.sql` was added for legacy invitation lifecycle
control. None of these migrations has been applied to
live Turso, and no deployment was triggered. The migration and backend routes
must be verified against a disposable database and a fresh backup before
release.

Deployment ownership, domain configuration, environment provisioning, provider scopes, and production traffic behavior are therefore unknown and must not be inferred from the committed URLs/config alone. A non-secret backend variable template is available at [`backend/.env.example`](../backend/.env.example). The API now exposes dependency-free `/health` liveness and coarse `/health/ready` readiness probes; readiness reports only `up`, `down`, or `disabled` states for Turso and Redis.

## Operational risks and next steps

1. Keep the root/package locked-install commands aligned and use the disposable test database verification before schema changes.
2. Monitor the production Upstash quota and keep Redis explicitly disabled only in local environments.
3. Add safe structured request logs, error monitoring, and graceful shutdown checks; use `/health` and `/health/ready` in deployment checks.
4. Add migration/deployment gates and document Turso backup/restore ownership. The repeatable runner, empty-state migration check, and synthetic restore rehearsal exist; real backup schedule, recovery target, rollback ownership, and remote CI observation remain open.
5. Record Vercel/frontend deployment responsibilities and rollback behavior.

## Existing operational notes

[database/operations.md](../database/operations.md) contains Turso CLI dump/drop/restore examples. They are manual operational notes, not a migration or recovery system, and must be reviewed before use against a real database.
