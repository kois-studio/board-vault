# Testing and verification

## Inventory at bootstrap

- Backend: `backend/test/app.e2e-spec.ts` plus focused security, validation, persistence, recommendation, session, and provider-boundary suites under `backend/src/`.
- Frontend: `frontend/src/app/app.component.spec.ts`, API response-contract coverage, collection activation guidance, and session schedule/detail component coverage.
- Frontend browser coverage now uses Playwright under `frontend/e2e/`; the suite is configured to run against an isolated local Angular server on port 4300 or an explicit `PLAYWRIGHT_BASE_URL`. Public tests run by default. Authenticated core-navigation tests activate only when `PLAYWRIGHT_AUTH_STORAGE_STATE` points to a local, uncommitted Clerk storage-state JSON file. The opt-in `collection-activation-flow.spec.ts` covers first-game activation and duplicate protection; `social-session-flow.spec.ts` uses separate owner/member states and a fresh fixture from `database/scripts/seed-social-fixture.mjs` to cover the two-account flagship loop; `social-invitation-flow.spec.ts` covers an existing-account invite and acceptance; `recommendation-decision-flow.spec.ts` covers explainable suggestions, persisted group feedback, and the session-planning handoff.
- No broad contract, migration, persistence, provider-adapter, accessibility, or responsive tests were found; focused authorization boundary tests now exist.
- A manual migration verification was run against a restored SQLite backup copy; it is not an automated migration suite.

## Verified baseline

| Check | Result | Interpretation |
|---|---|---|
| `cd backend && npm run build` | Pass | TypeScript/Nest build currently compiles. |
| `cd backend && npm test -- --runInBand` | Pass | 230 tests across 45 suites cover the previously documented Clerk, validation and request-size boundaries, authorization, privacy, logging, cache, and migration-boundary areas plus canonical session validation, service-level session participation invariants, transaction commit/rollback behavior, planned-game validation, lifecycle transition rules including the required scheduled-to-active step, terminal planned-to-skipped transitions, per-game participant persistence, completed-only play-history filtering, deterministic recommendations, Clerk group invitations, owner-only legacy invitation creation, provider invitation listing/revocation boundaries, soft-deleted account exclusion, account-scoped invitation visibility and expiry, atomic invitation acceptance, verified-user gating, admin route-parameter and list-query validation, bounded collection browse and duplicate-review query inputs, bounded group names, self-profile response privacy, deprecated-route removal, cache maintenance endpoint protection, safe API error normalization, health/readiness probes, constraint-specific empty states, recommendation feedback validation, group acquisition ownership-race protection and owner decisions, non-destructive cache diagnostic failure handling, and member-scoped canonical session reads; broader authorization coverage remains absent. |
| `cd backend && npm run test:e2e -- --runInBand` | Pass | Two environment-safe HTTP tests cover unauthenticated Clerk status rejection and invalid public query validation using a disposable SQLite URL and disabled Redis. |
| `cd backend && npx eslint "{src,apps,libs,test}/**/*.ts"` | Pass | No errors or warnings; CI runs the same no-mutation command. |
| `cd frontend && npm run build` | Pass | PostCSS flattens Tailwind’s generated nesting, route-level components are lazy-loaded, and the latest initial raw bundle is 603.43 kB (137.99 kB estimated transfer) under the 650 kB warning budget. |
| `cd frontend && npx biome check src/app` | Pass | No diagnostics. |
| `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` | Pass | 32 browser-based unit tests pass, including private collection-boundary and activation guidance, invitation-decline confirmation, pending Clerk invitation contracts, schedule handoff/submission, session participant safeguards, group-history attendee summaries, upcoming-session social context labels, recommendation history context, attendee controls, and decision-lens semantics, accessible theme-control labels, valid and malformed self-profile/auth response-contract cases, canonical session detail/lifecycle contracts, direct collection-add, acquisition-board and recommendation-lens contracts, provider invitation rejection, false-success rejection, administrator pagination, and notification response contracts. |
| `cd frontend && npm run e2e` | Pass | Four public Playwright tests pass by default, including the Clerk invitation-ticket registration path; seven authenticated core-navigation tests cover dashboard, groups/collection entry points, session logging, upcoming sessions, history, and recommendations. Five opt-in journeys cover collection activation, invitation acceptance, the two-account session loop, recommendation feedback/planning handoff, and group acquisition decisions. With a disposable owner Clerk state plus recommendation and acquisition fixtures, 13 tests pass locally and three fixture-gated journeys skip; with only the core auth state, the seven authenticated tests pass and the five opt-in journeys skip. |
| `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_OWNER_STORAGE_STATE=/tmp/board-vault-clerk-owner.json PLAYWRIGHT_MEMBER_STORAGE_STATE=/tmp/board-vault-clerk-member.json PLAYWRIGHT_SOCIAL_SESSION_ID=<id> PLAYWRIGHT_SOCIAL_GROUP_NAME=<name> PLAYWRIGHT_SOCIAL_GAME_TITLE=<title> npx playwright test e2e/social-session-flow.spec.ts` | Pass | A fresh fixture from `seed-social-fixture.mjs` passed RSVP, refresh, owner lifecycle, attendance, per-game participant editing, retryable detail loading, completion, feedback, and history verification in 6.4 seconds after refreshing expired development-only Clerk storage states. The test is intentionally skipped unless both local Clerk states and the generated session/group/game values are supplied. |
| `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_OWNER_STORAGE_STATE=/tmp/board-vault-clerk-owner.json PLAYWRIGHT_INVITEE_STORAGE_STATE=/tmp/board-vault-clerk-invitee.json PLAYWRIGHT_INVITATION_GROUP_ID=<id> PLAYWRIGHT_INVITATION_GROUP_NAME=<name> PLAYWRIGHT_INVITEE_USERNAME=<username> npx playwright test e2e/social-invitation-flow.spec.ts` | Pass | A fresh disposable group passed owner invite, recipient refresh, invitation acceptance, and post-acceptance group visibility. Email-provider delivery, expiry, and failure/retry paths remain separate checks. |
| Local dev owner provider-invitation rehearsal | Pass | Against the linked development Clerk instance and disposable local SQLite, an owner created a new email invitation, observed it in the pending list, revoked it, and confirmed it was absent after refresh. The provider’s real invitation identifier format is `inv_...`; the empty state intentionally hides the pending-list heading once no invitations remain. Acceptance after recipient verification, expiry, and provider delivery failure/retry remain open. |
| `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_COLLECTION_STORAGE_STATE=/tmp/board-vault-clerk-collection.json PLAYWRIGHT_COLLECTION_GAME_SEARCH=<term> PLAYWRIGHT_COLLECTION_GAME_TITLE=<title> npx playwright test e2e/collection-activation-flow.spec.ts` | Pass | A fresh disposable account passed empty private-shelf guidance, first-game catalog activation, persisted refresh state, duplicate protection, and private-shelf visibility. The test mutates one collection and remains intentionally fixture-scoped. |
| `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_RECOMMENDATION_STORAGE_STATE=/tmp/board-vault-clerk-owner.json PLAYWRIGHT_RECOMMENDATION_GROUP_ID=<id> PLAYWRIGHT_RECOMMENDATION_ATTENDEE_IDS=<ids> PLAYWRIGHT_RECOMMENDATION_GAME_TITLE=<title> npx playwright test e2e/recommendation-decision-flow.spec.ts` | Pass | A disposable authenticated owner journey selected a decision lens, loaded explainable suggestions, saved group feedback, recovered the signal after a fresh page load, and handed the selected game and attendees into session planning. The test is fixture-scoped and can reuse an existing interested signal. |
| `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_ACQUISITION_STORAGE_STATE=/tmp/board-vault-clerk-owner.json PLAYWRIGHT_ACQUISITION_GROUP_ID=<id> PLAYWRIGHT_ACQUISITION_GAME_TITLE=<title> npx playwright test e2e/acquisition-decision-flow.spec.ts` | Pass | A disposable authenticated owner journey resolved an acquisition candidate as planned, moved it to not-now, reopened it, and verified the owner decision survives refresh. The test is fixture-scoped and intentionally mutates only disposable group decision data. |
| Local Clerk impersonation plus Board Vault handshake | Pass | A temporary actor issued against the linked development instance reached the local Angular app on port 4300; the backend accepted the Clerk session, provisioned the development identity into disposable SQLite, and served the authenticated dashboard. Local development CORS now includes both Angular's default 4200 origin and the isolated 4300 browser-test origin. |
| `node database/scripts/verify-empty-state.mjs` | Pass | Loads the current deployed schema snapshot into disposable SQLite, reports `PRAGMA integrity_check = ok`, records baseline 0005, applies pending migrations 0006–0009, and asserts the acquisition/decision tables, session-notes column, invitation expiry column, and nine-migration state exist. |
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
