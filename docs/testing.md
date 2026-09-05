# Testing and verification

## Inventory at bootstrap

- Backend: `backend/test/app.e2e-spec.ts` plus focused security, validation, persistence, recommendation, session, and provider-boundary suites under `backend/src/`.
- Frontend: `frontend/src/app/app.component.spec.ts`, API response-contract coverage, collection activation guidance, and session schedule/detail component coverage.
- Frontend browser coverage now uses Playwright under `frontend/e2e/`; the suite is configured to run against an isolated local Angular server on port 4300 or an explicit `PLAYWRIGHT_BASE_URL`. Public tests run by default. Authenticated core-navigation tests activate only when `PLAYWRIGHT_AUTH_STORAGE_STATE` points to a local, uncommitted Clerk storage-state JSON file.
- No broad contract, migration, persistence, provider-adapter, accessibility, or responsive tests were found; focused authorization boundary tests now exist.
- A manual migration verification was run against a restored SQLite backup copy; it is not an automated migration suite.

## Verified baseline

| Check | Result | Interpretation |
|---|---|---|
| `cd backend && npm run build` | Pass | TypeScript/Nest build currently compiles. |
| `cd backend && npm test -- --runInBand` | Pass | 206 tests across 44 suites cover the previously documented Clerk, validation, authorization, privacy, logging, cache, and migration-boundary areas plus canonical session validation, service-level session participation invariants, transaction commit/rollback behavior, planned-game validation, lifecycle transition rules, terminal planned-to-skipped transitions, per-game participant persistence, completed-only play-history filtering, deterministic recommendations, Clerk group invitations, account-scoped invitation visibility and expiry, atomic invitation acceptance, verified-user gating, admin route-parameter and list-query validation, self-profile response privacy, deprecated-route removal, cache maintenance endpoint protection, safe API error normalization, health/readiness probes, constraint-specific empty states, recommendation feedback validation, non-destructive cache diagnostic failure handling, and member-scoped canonical session reads; broader authorization coverage remains absent. |
| `cd backend && npm run test:e2e -- --runInBand` | Pass | Two environment-safe HTTP tests cover unauthenticated Clerk status rejection and invalid public query validation using a disposable SQLite URL and disabled Redis. |
| `cd backend && npx eslint "{src,apps,libs,test}/**/*.ts"` | Pass | No errors or warnings; CI runs the same no-mutation command. |
| `cd frontend && npm run build` | Pass | PostCSS flattens Tailwind’s generated nesting, route-level components are lazy-loaded, and the latest initial raw bundle is 599.05 kB (137.90 kB estimated transfer) under the 650 kB warning budget. |
| `cd frontend && npx biome check src/app` | Pass | No diagnostics. |
| `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` | Pass | 22 browser-based unit tests pass, including collection activation guidance, schedule handoff/submission, session participant safeguards, group-history attendee summaries, upcoming-session social context labels, recommendation history context, accessible theme-control labels, valid and malformed self-profile/auth response-contract cases, canonical session detail/lifecycle contracts, direct collection-add, administrator pagination, and notification response contracts. |
| `cd frontend && npm run e2e` | Pass | Four public Playwright tests pass, including the Clerk invitation-ticket registration path; seven authenticated core-navigation tests cover dashboard, groups/collection entry points, session logging, upcoming sessions, history, and recommendations, and are intentionally skipped unless `PLAYWRIGHT_AUTH_STORAGE_STATE` is supplied. |
| `node database/scripts/verify-empty-state.mjs` | Pass | Loads the current deployed schema snapshot into disposable SQLite, reports `PRAGMA integrity_check = ok`, records baseline 0005, applies pending migrations 0006–0008, and asserts the acquisition table, session-notes column, invitation expiry column, and eight-migration state exist. |
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
- frontend browser journeys for public navigation, Clerk authentication, collection activation, group invitations, session creation/completion, and history. The reusable authenticated navigation suite now covers dashboard, groups, collection entry points, session logging, upcoming sessions, history, and recommendations; collection mutations, invitations, and full session submission still need a non-production Clerk test state and seeded data. Local component coverage now protects schedule handoff/submission, session participant safeguards, group-history attendee summaries, upcoming-session social context labels, and recommendation history context.

### P2 delivery quality

- API contract compatibility and response validation;
- provider fakes for Turso/Redis/Resend;
- health/readiness and shutdown behavior;
- browser journey coverage against a clean environment.

## Test isolation rules

Tests must not depend on a developer’s real Turso, Redis, or Resend credentials. Use a disposable database or explicit provider fakes. Do not make a test pass by disabling authorization or using production data. Record any intentionally untested boundary as an explicit exception or deferred gap.

## Running authenticated browser journeys

Create a local Playwright storage state by signing in with a dedicated test
account, then point the suite at that uncommitted file:

```shell
PLAYWRIGHT_AUTH_STORAGE_STATE=/absolute/path/to/board-vault-auth.json npm run e2e
```

The storage-state file may contain session cookies and tokens. Keep it outside
the repository, never commit it, and prefer a disposable Clerk/test account.

## Completion evidence

A feature task is not complete because the build passes. The task board requires affected checks, authorization/invalid-input evidence where relevant, documentation/API updates, and known follow-ups. See [todo/README.md](../todo/README.md).
