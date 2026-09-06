# Testing and verification

## Inventory at bootstrap

- Backend: `backend/test/app.e2e-spec.ts` plus focused security, validation, persistence, recommendation, session, and provider-boundary suites under `backend/src/`.
- Frontend: `frontend/src/app/app.component.spec.ts`, API response-contract coverage, collection activation guidance, and session schedule/detail component coverage.
- Frontend browser coverage now uses Playwright under `frontend/e2e/`; the suite is configured to run against an isolated local Angular server on port 4300 or an explicit `PLAYWRIGHT_BASE_URL`. Public tests run by default. Authenticated core-navigation tests activate only when `PLAYWRIGHT_AUTH_STORAGE_STATE` points to a local, uncommitted Clerk storage-state JSON file. The opt-in `collection-activation-flow.spec.ts` covers first-game activation and duplicate protection; `collection-five-game-activation.spec.ts` covers the complete five-game ready-state handoff with a file-only catalog fixture from `database/scripts/seed-collection-activation-fixture.mjs`; `social-session-flow.spec.ts` uses separate owner/member states and a fresh fixture from `database/scripts/seed-social-fixture.mjs` to cover the two-account flagship loop; `social-invitation-flow.spec.ts` covers an existing-account invite and acceptance; `group-destructive-flow.spec.ts` covers owner/member contextual confirmations and legacy URL handoffs; `settings-security-flow.spec.ts` covers semantic settings navigation and truthful account-deletion policy copy; `recommendation-decision-flow.spec.ts` covers explainable suggestions, persisted group feedback, and the session-planning handoff.
- No broad contract, migration, persistence, provider-adapter, accessibility, or responsive tests were found; focused authorization boundary tests and a rendered core-route audit now exist. The core audit also guards against duplicate focus stops on routed shared buttons.
- A manual migration verification was run against a restored SQLite backup copy; it is not an automated migration suite.

## Verified baseline

| Check | Result | Interpretation |
|---|---|---|
| `cd backend && npm run build` | Pass | TypeScript/Nest build currently compiles. |
| `cd backend && npm test -- --runInBand` | Pass | 237 tests across 46 suites cover the previously documented Clerk, validation and request-size boundaries, authorization, privacy, logging, cache, and migration-boundary areas plus canonical session validation, service-level session participation invariants, transaction commit/rollback behavior, planned-game validation, lifecycle transition rules including the required scheduled-to-active step, terminal planned-to-skipped transitions, per-game participant persistence, completed-only play-history filtering, deterministic recommendations, Clerk group invitations, owner-only legacy invitation creation, provider invitation listing/revocation boundaries, safe private-beta/Clerk provider diagnostic-code mapping, soft-deleted account exclusion, account-scoped invitation visibility and expiry, atomic invitation acceptance, verified-user gating, admin route-parameter and list-query validation, bounded collection browse and duplicate-review query inputs, bounded group names, self-profile response privacy, deprecated-route removal, cache maintenance endpoint protection, safe API error normalization, correlated request logging without query strings, service-log redaction for email/provider and free-text boundaries, health/readiness probes, constraint-specific empty states, recommendation feedback validation, group acquisition ownership-race protection and owner decisions, non-destructive cache diagnostic failure handling, member-scoped canonical session reads, and legacy played-game ownership validation; broader remote integration remains open. |
| `cd backend && npm test -- --runInBand src/common/middlewares/logger.middleware.spec.ts src/common/http/api-error.filter.spec.ts` | Pass | Focused regression coverage confirms request IDs are returned and reused, structured start/complete events use the real request path (including `/auth/clerk/status`), query strings and authorization values do not enter request logs, and unexpected failures remain safely normalized. |
| `cd backend && npm run test:e2e -- --runInBand` | Pass | Two environment-safe HTTP tests cover unauthenticated Clerk status rejection and invalid public query validation using a disposable SQLite URL and disabled Redis. |
| `cd backend && npx eslint "{src,apps,libs,test}/**/*.ts"` | Pass | No errors or warnings; CI runs the same no-mutation command. |
| `cd frontend && npm run build` | Pass | PostCSS flattens Tailwind’s generated nesting, route-level components are lazy-loaded, and the latest initial raw bundle is 605.70 kB (138.25 kB estimated transfer) under the 650 kB warning budget. |
| `cd frontend && npx biome check src/app` | Pass | No diagnostics. |
| `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` | Pass | 43 browser-based unit tests pass, including private collection-boundary and activation guidance, first-empty-group onboarding, invitation-decline confirmation, pending Clerk invitation contracts, schedule handoff/submission, truthful schedule loading/unavailable states, stale schedule-context clearing, session participant safeguards, group-history attendee/player summaries and recommendation handoff, shared-memory history filtering and summary signals, upcoming-session social context labels, recommendation history context, attendee controls, decision-context semantics, accessible theme-control labels, valid and malformed self-profile/auth response-contract cases, canonical session detail/lifecycle contracts, direct collection-add, acquisition-board and recommendation-lens contracts, provider invitation rejection, false-success rejection, administrator pagination, notification response contracts, direct navigation to the newly created group workspace, protected-route account-readiness gating, the social group-entry surface, coordination-inbox context, and group-first Play entry. |
| `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4300 npx playwright test e2e/public-navigation.spec.ts` | Pass | Five public navigation tests pass after the landing and invitation-registration copy updates. The suite now protects the social-loop landing promise at mobile/desktop widths, signed-out redirect, not-found route, and invitation form entry point. |
| `cd frontend && npm run e2e` | Pass | Five public Playwright tests pass by default, including the Clerk invitation-ticket registration path and responsive landing assertions; nine authenticated core-navigation tests cover dashboard, groups/collection entry points, unavailable-group recovery, session logging, upcoming sessions, history, and recommendations. The opt-in rendered core audit checks group, collection, session, upcoming, and history routes at 375px, 768px, and 1280px for overflow and unnamed visible controls. Five fixture-gated journeys cover collection activation, invitation acceptance, the two-account session loop, recommendation feedback/planning handoff, and group acquisition decisions. |
| `cd frontend && npm run build`, `npx biome check src/app`, `npm test -- --watch=false --browsers=ChromeHeadless` after upcoming/scheduling UX slice | Pass | Production build, frontend Biome, and all 37 browser unit tests pass after adding truthful loading/unavailable-group states to the canonical schedule route, clearing stale schedule context on membership refresh, redesigning upcoming sessions around group-first planning, adding explicit history summary contracts, adding the history-to-recommendation handoff, making group creation land in the new workspace, waiting for local account readiness before protected-route activation, and making recommendations preserve group decision context. |
| `cd frontend && npm run build`, `npx biome check src/app`, `npm test -- --watch=false --browsers=ChromeHeadless`, public Playwright | Pass | The core-route accessibility pass adds global keyboard focus-visible rings, explicit date/notes labels on session creation, alert semantics for history/upcoming failures, removes the duplicate tab stop exposed by routed shared buttons, retires unused client compatibility adapters, protects the landing promise at mobile/desktop widths, keeps history player names in shared-memory cards, preserves group context in recommendations, makes group entries expose explicit social actions instead of one opaque clickable card, adds honest group context/status prompts to upcoming sessions, makes Play group-first, and gives genuinely empty new groups an invite → add games → plan first night handoff; the latest build is 605.70 kB raw (138.25 kB estimated transfer), Biome and all 43 browser unit tests pass, and five public navigation tests remain green. |
| Frontend core loading-state follow-up | Pass | Group-home pulse and history, standalone history, and upcoming-session loading states now announce progress and avoid presenting a transient zero-session count as settled data; production build, Biome, and all 43 browser unit tests remain green. |
| Group creation readiness/handoff follow-up | Pass | The focused group-create component now keeps submission disabled and announces account loading until the authenticated local account is available, then navigates to the newly created group workspace. The workspace now detects a genuinely empty one-person group and surfaces owner/member-appropriate first steps. Focused group-create and first-group-setup tests pass; the full frontend suite remains green at 43 tests. |
| Protected-route account-readiness follow-up | Pass | Clerk/legacy auth verification now waits for the local account profile before emitting an authenticated guard result; a focused LoginService regression proves no protected route can activate on provider-session state alone. The full frontend suite remains green at 41 tests. |
| `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_AUTH_STORAGE_STATE=/tmp/board-vault-clerk-owner.json PLAYWRIGHT_GROUP_ID=<id> npx playwright test e2e/authenticated-core.spec.ts --grep "accessible names"` | Pass | The rendered group-library check confirms image-only game links have visible hit areas and accessible names; it is intentionally skipped unless a disposable local group ID is supplied. |
| `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_AUTH_STORAGE_STATE=/tmp/board-vault-clerk-owner.json PLAYWRIGHT_GROUP_ID=<id> npx playwright test e2e/authenticated-core.spec.ts` | Pass | Nine authenticated navigation checks pass, including the 375px group-workspace overflow guard, ordered workspace navigation, accessible game/history links, unavailable-group recovery, and the primary collection/session/history/recommendation entry points. |
| `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_AUTH_STORAGE_STATE=/tmp/board-vault-clerk-owner.json PLAYWRIGHT_GROUP_ID=<id> PLAYWRIGHT_SESSION_ID=<id> npx playwright test e2e/rendered-core-audit.spec.ts` | Pass | The core rendered audit passes group, group-edit, session planning/detail, collection, upcoming-session, and history routes at 375px, 768px, and 1280px with no document overflow, unnamed visible controls, or focusable routed `app-button` hosts. It remains opt-in because it uses disposable authenticated state. |
| `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_GROUP_ID=<id> PLAYWRIGHT_OWNER_STORAGE_STATE=<owner-state> PLAYWRIGHT_MEMBER_STORAGE_STATE=<member-state> npx playwright test e2e/group-destructive-flow.spec.ts` | Pass | Disposable owner/member states pass the contextual delete/leave confirmation checks without executing mutations; legacy delete and leave URLs hand off to group management and group workspace respectively. |
| `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_AUTH_STORAGE_STATE=<owner-state> npx playwright test e2e/settings-security-flow.spec.ts` | Pass | Disposable authenticated settings coverage confirms Profile/Security are semantic links, Clerk remains the actionable security surface, and the account-deletion placeholder is replaced by truthful policy copy. |
| `TURSO_DATABASE_URL=file:/tmp/board-vault-clerk-F1T4x3/local.db FIXTURE_COLLECTION_ACCOUNT_ID=<id> node database/scripts/seed-collection-activation-fixture.mjs` plus `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_COLLECTION_STORAGE_STATE=/tmp/board-vault-clerk-collection.json PLAYWRIGHT_COLLECTION_GAME_TITLES='<five titles>' npx playwright test e2e/collection-five-game-activation.spec.ts` | Pass | A local-only fixture seeded five catalog translations and the disposable collection journey reached “Your games are ready for group decisions” in 7.7 seconds. The script rejects non-`file:` database URLs. |
| `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_OWNER_STORAGE_STATE=/tmp/board-vault-clerk-owner.json PLAYWRIGHT_MEMBER_STORAGE_STATE=/tmp/board-vault-clerk-member.json PLAYWRIGHT_OWNER_PRIVATE_GAME_TITLE=<owner-only title> PLAYWRIGHT_MEMBER_PRIVATE_GAME_TITLE=<member-only title> npx playwright test e2e/collection-privacy-flow.spec.ts` | Pass | Two disposable Clerk identities each see their own private shelf and do not see the other person’s private-only game. This validates the personal/shared data distinction without relying on a public catalog route. |
| `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_OWNER_STORAGE_STATE=/tmp/board-vault-clerk-owner-fresh.json PLAYWRIGHT_MEMBER_STORAGE_STATE=/tmp/board-vault-clerk-member-fresh.json PLAYWRIGHT_SOCIAL_SESSION_ID=<id> PLAYWRIGHT_SOCIAL_GROUP_NAME=<name> PLAYWRIGHT_SOCIAL_GAME_TITLE=<title> npx playwright test e2e/social-session-flow.spec.ts` | Pass | A fresh fixture from `seed-social-fixture.mjs` passed RSVP, refresh, owner lifecycle, attendance, per-game participant editing, retryable detail loading, completion, feedback, and visible history-card verification in 5.3 seconds after refreshing the disposable owner Clerk state. The test is intentionally skipped unless both local Clerk states and the generated session/group/game values are supplied. |
| `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_OWNER_STORAGE_STATE=/tmp/board-vault-clerk-owner-fresh.json PLAYWRIGHT_INVITEE_STORAGE_STATE=/tmp/board-vault-clerk-member-fresh.json PLAYWRIGHT_INVITATION_GROUP_ID=<id> PLAYWRIGHT_INVITATION_GROUP_NAME=<name> PLAYWRIGHT_INVITEE_USERNAME=bvtestmember npx playwright test e2e/social-invitation-flow.spec.ts` | Pass | A fresh disposable owner-only group passed owner invite, recipient refresh, invitation acceptance, and post-acceptance group visibility in 3.2 seconds. Email-provider delivery, expiry, and failure/retry paths remain separate checks. |
| Local dev provider-invitation rehearsal | Pass with explicit exception | Against the linked development Clerk instance and disposable local SQLite, the owner create/list/revoke/removal flow passes with real `inv_...` identifiers and awaited list refreshes. The custom ticket flow reaches `/register`, collects the configured username/password requirements, activates the Clerk session, and redirects to `/dashboard`; this was verified with a disposable valid-format address and `notify:false` while development Smart CAPTCHA was temporarily disabled, then restored and verified enabled. A fresh enabled-CAPTCHA headless attempt again reached `/register` but stopped at Clerk’s challenge, so human CAPTCHA interaction, email delivery, expiry, and provider delivery-failure/retry remain separate checks. Invalid `example.test` addresses are rejected by Clerk and must not be used as provider fixtures. |
| `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_COLLECTION_STORAGE_STATE=/tmp/board-vault-clerk-collection.json PLAYWRIGHT_COLLECTION_GAME_SEARCH=<term> PLAYWRIGHT_COLLECTION_GAME_TITLE=<title> npx playwright test e2e/collection-activation-flow.spec.ts` | Pass | A fresh disposable account passed empty private-shelf guidance, first-game catalog activation, persisted refresh state, duplicate protection, and private-shelf visibility. The test mutates one collection and remains intentionally fixture-scoped. |
| `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_RECOMMENDATION_STORAGE_STATE=/tmp/board-vault-clerk-owner.json PLAYWRIGHT_RECOMMENDATION_GROUP_ID=<id> PLAYWRIGHT_RECOMMENDATION_ATTENDEE_IDS=<ids> PLAYWRIGHT_RECOMMENDATION_GAME_TITLE=<title> npx playwright test e2e/recommendation-decision-flow.spec.ts` | Pass | A disposable authenticated owner journey selected a decision lens, loaded explainable suggestions, saved group feedback, recovered the signal after a fresh page load, and handed the selected game and attendees into session planning. The test is fixture-scoped and can reuse an existing interested signal. |
| `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_ACQUISITION_STORAGE_STATE=/tmp/board-vault-clerk-owner.json PLAYWRIGHT_ACQUISITION_GROUP_ID=<id> PLAYWRIGHT_ACQUISITION_GAME_TITLE=<title> npx playwright test e2e/acquisition-decision-flow.spec.ts` | Pass | A disposable authenticated owner journey resolved an acquisition candidate as planned, moved it to not-now, reopened it, and verified the owner decision survives refresh. The test is fixture-scoped and intentionally mutates only disposable group decision data. |
| Local Clerk impersonation plus Board Vault handshake | Pass | A temporary actor issued against the linked development instance reached the local Angular app on port 4300; the backend accepted the Clerk session, provisioned the development identity into disposable SQLite, and served the authenticated dashboard. Local development CORS now includes both Angular's default 4200 origin and the isolated 4300 browser-test origin. |
| Read-only production Clerk configuration pull | Pass | The exact production instance reports restricted sign-up mode, required email/username/password fields, a 15-character password minimum, email verification at sign-up, and Smart CAPTCHA enabled. No production Clerk setting was changed. |
| `node database/scripts/verify-empty-state.mjs` | Pass | Loads the current deployed schema snapshot into disposable SQLite, reports `PRAGMA integrity_check = ok`, records baseline 0005, applies pending migrations 0006–0009, and asserts the acquisition/decision tables, session-notes column, invitation expiry column, and nine-migration state exist. |
| `turso db export board-vault` to a disposable local SQLite copy, then `TURSO_DATABASE_URL=file:<copy> node database/scripts/migrate.mjs` | Pass | A fresh read-only export of live `board-vault` verified `PRAGMA integrity_check = ok`, no foreign-key violations, 16 accounts, 13 sessions, 22 session-game links, and 5 groups; migrations 0006–0009 then applied cleanly to the copy and preserved those counts. Production was not modified. |
| `cd backend && npm test -- --runInBand src/modules/features/sessions/sessions.service.spec.ts` | Pass | Fourteen tests cover canonical completed/scheduled creation, planned-game availability, missing groups, actor membership, selected attendee membership, group game availability, participant/attendee consistency, and lifecycle transitions. |
| `schema.sql` plus migration 0004 in disposable SQLite | Pass | A restored pre-0004 dump accepts the lifecycle migration; integrity is `ok`, no foreign-key violations are reported, and all four lifecycle columns/indexes exist. |
| `sqlite3 backup-copy < database/migrations/0001-add-clerk-user-id.sql` | Pass | SQLite integrity remains `ok`; 15 accounts, 13 meets, and 101 meet/game links are preserved; the original backup was not used as the test target. |
| Schema plus migration 0002 in disposable SQLite memory database | Pass | Full schema loaded with migration 0002; integrity is `ok`, both expiry columns exist, a valid token succeeds once, second use affects zero rows, and an expired token affects zero rows. No live Turso data was changed. |
| Live Turso migration 0002 verification | Pass | Fresh local dump was taken before the additive migration; live integrity and foreign-key checks passed, both expiry columns exist, aggregate counts remain 16 accounts, 13 meets, and 101 meet/game links, and no existing token-bearing rows required backfill. |
| Empty-state and representative-data migration 0003 verification | Pass | Current schema plus migration 0003 creates the additive tables cleanly; a preserved-data dump backfills 63 `MeetAttendee` rows and 22 `MeetGame` rows from 101 `MeetAccountGame` links; integrity is `ok` and no source rows are deleted. |
| Local Clerk sign-in plus `GET /auth/clerk/status` | Pass | Clerk session verification succeeded and linked the matching existing live account `#1`; live Turso reports one linked account and preserved admin state. Production currently uses email/password/username only; Google OAuth is intentionally disabled. This is a manual verification, not automated coverage. |

## Required testing strategy for the next development round

### P0 security and data truth

- user update privilege boundaries;
- JWT expiry, verification state, reset behavior, and generic account responses;
- object-level ownership for users, collections, groups, invitations, notifications, meets, and admin actions;
- malformed/oversized input and stable error responses;
- schema/migration recreation and transaction partial-failure behavior.

### P1 flagship journey

- group creation/joining and invitation lifecycle;
- collection activation with empty/error states;
- deterministic explainable recommendation scoring, including collective attendee ownership, invalid attendee rejection, and stable ordering;
- atomic completed/scheduled session creation, planned/played distinction, lifecycle transitions, completion, awaited detail edits, and history;
- frontend loading, empty, failure, retry, and mobile/accessibility states.
- frontend browser journeys for public navigation, Clerk authentication, collection activation, group invitations, session creation/completion, and history. The reusable authenticated navigation suite now covers dashboard, groups, collection entry points, session logging, upcoming sessions, history, and recommendations. Opt-in journeys now cover first-game collection activation, existing-account invite acceptance, and session creation through a seeded fixture with RSVP, attendance, per-game participants, lifecycle, retry, feedback, and history. A five-game activation run, collection ownership metadata, secure email-invite delivery, and invitation expiry/failure paths still need repeatable non-production fixtures. Local component coverage now protects schedule handoff/submission, session participant safeguards, group-history attendee summaries, upcoming-session social context labels, and recommendation history context.

### P2 delivery quality

- API contract compatibility and response validation;
- provider fakes for Turso/Redis/Resend;
- health/readiness and shutdown behavior;
- browser journey coverage against a clean environment.

## Test isolation rules

Tests must not depend on a developer’s real Turso, Redis, or Resend credentials. Use a disposable database or explicit provider fakes. Do not make a test pass by disabling authorization or using production data. Record any intentionally untested boundary as an explicit exception or deferred gap.

## Running authenticated browser journeys

The Clerk CLI authenticates the developer account, not the application user.
For development testing, use its impersonation flow against the linked
development instance so no personal password or MFA code is needed:

```shell
clerk whoami
clerk users list --instance dev
clerk impersonate <development-user-id> --instance dev --print --yes
```

The last command prints a temporary sign-in URL. Open that URL with Playwright
Codegen, complete the redirect to the local app, and close the browser to save
the storage state:

```shell
cd frontend
npx playwright codegen \
  --save-storage=/tmp/board-vault-clerk-owner.json \
  '<paste-the-impersonation-url-here>'
```

If the development Clerk instance has no application home URL configured, the
first redirect may land on Clerk's development account page instead of the
local app. In that case, add a URL-encoded `redirect_url` query parameter to
the printed URL before opening it, for example
`redirect_url=http%3A%2F%2Flocalhost%3A4300%2F`. Keep the temporary URL private;
it contains a short-lived actor token.

Use a dedicated development/test user. Never run impersonation with a
production instance, and never use a production user for local mutation tests.
The backend must also be running with a configured, non-production
`backend/.env` (see [`backend/.env.example`](../backend/.env.example)).
Then point the suite at the uncommitted file:

```shell
PLAYWRIGHT_AUTH_STORAGE_STATE=/tmp/board-vault-clerk-owner.json npm run e2e
```

The storage-state file may contain session cookies and tokens. Keep it outside
the repository, never commit it, and prefer a disposable Clerk/test account.
When the isolated frontend runs on port 4300, start the backend with
`BOARD_VAULT_CLERK_INVITATION_REDIRECT_URL=http://localhost:4300/register`; the
development default remains port 4200 for the standard Angular server. A real
provider ticket should redirect to local `/register` before the Clerk sign-up
exchange is evaluated.
For two-person invitation acceptance, repeat the workflow for a second
development user and save `/tmp/board-vault-clerk-member.json`; the current
single-state suite uses one file, while the full two-account rehearsal requires
both identities. The social session journey expects a scheduled session already
seeded in the disposable database. Create one repeatably with the root
`npm run seed:social-fixture` command documented in
[`database/README.md`](../database/README.md), then run the journey with:

```shell
PLAYWRIGHT_BASE_URL=http://localhost:4300 \
PLAYWRIGHT_OWNER_STORAGE_STATE=/tmp/board-vault-clerk-owner.json \
PLAYWRIGHT_MEMBER_STORAGE_STATE=/tmp/board-vault-clerk-member.json \
PLAYWRIGHT_SOCIAL_SESSION_ID=<disposable-session-id> \
PLAYWRIGHT_SOCIAL_GROUP_NAME=<disposable-group-name> \
PLAYWRIGHT_SOCIAL_GAME_TITLE=<game-title> \
npx playwright test e2e/social-session-flow.spec.ts
```

The journey mutates that session to completed and is not a production smoke
test. Create a fresh scheduled fixture for each run.

The existing-account invitation journey expects a fresh disposable group owned
by the owner state and a recipient account that is not already a member:

```shell
PLAYWRIGHT_BASE_URL=http://localhost:4300 \
PLAYWRIGHT_OWNER_STORAGE_STATE=/tmp/board-vault-clerk-owner.json \
PLAYWRIGHT_INVITEE_STORAGE_STATE=/tmp/board-vault-clerk-invitee.json \
PLAYWRIGHT_INVITATION_GROUP_ID=<disposable-group-id> \
PLAYWRIGHT_INVITATION_GROUP_NAME=<disposable-group-name> \
PLAYWRIGHT_INVITEE_USERNAME=<existing-account-username> \
npx playwright test e2e/social-invitation-flow.spec.ts
```

It mutates the group by creating membership and is therefore also limited to
disposable development data.

The collection activation journey expects a fresh disposable account with no
owned copy of the selected game:

```shell
PLAYWRIGHT_BASE_URL=http://localhost:4300 \
PLAYWRIGHT_COLLECTION_STORAGE_STATE=/tmp/board-vault-clerk-collection.json \
PLAYWRIGHT_COLLECTION_GAME_SEARCH=<search-term> \
PLAYWRIGHT_COLLECTION_GAME_TITLE=<exact-game-title> \
npx playwright test e2e/collection-activation-flow.spec.ts
```

It mutates the account’s collection and should be run only against disposable
development data.

The recommendation decision journey expects an authenticated owner, a group,
selected member IDs, and a game that is present in the recommendation result:

```shell
PLAYWRIGHT_BASE_URL=http://localhost:4300 \
PLAYWRIGHT_RECOMMENDATION_STORAGE_STATE=/tmp/board-vault-clerk-owner.json \
PLAYWRIGHT_RECOMMENDATION_GROUP_ID=<disposable-group-id> \
PLAYWRIGHT_RECOMMENDATION_ATTENDEE_IDS=<account-id,account-id> \
PLAYWRIGHT_RECOMMENDATION_GAME_TITLE=<recommended-game-title> \
npx playwright test e2e/recommendation-decision-flow.spec.ts
```

It mutates recommendation feedback for the owner and is limited to disposable
development data.

The group acquisition decision journey expects the owner state to belong to a
group with an unowned acquisition candidate:

```shell
PLAYWRIGHT_BASE_URL=http://localhost:4300 \
PLAYWRIGHT_ACQUISITION_STORAGE_STATE=/tmp/board-vault-clerk-owner.json \
PLAYWRIGHT_ACQUISITION_GROUP_ID=<disposable-group-id> \
PLAYWRIGHT_ACQUISITION_GAME_TITLE=<unowned-candidate-title> \
npx playwright test e2e/acquisition-decision-flow.spec.ts
```

It mutates only the disposable group decision and should never be run against
production data.

## Completion evidence

A feature task is not complete because the build passes. The task board requires affected checks, authorization/invalid-input evidence where relevant, documentation/API updates, and known follow-ups. See [todo/README.md](../todo/README.md).
