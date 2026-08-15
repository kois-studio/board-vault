# Testing and verification

## Inventory at bootstrap

- Backend: one stale `backend/test/app.e2e-spec.ts` plus focused profile-update and ownership-boundary suites under `backend/src/`.
- Frontend: one `frontend/src/app/app.component.spec.ts`, a generated app-creation smoke test.
- No browser end-to-end framework or CI workflow was found.
- No broad contract, migration, persistence, provider-adapter, accessibility, or responsive tests were found; focused authorization boundary tests now exist.
- A manual migration verification was run against a restored SQLite backup copy; it is not an automated migration suite.

## Verified baseline

| Check | Result | Interpretation |
|---|---|---|
| `cd backend && npm run build` | Pass | TypeScript/Nest build currently compiles. |
| `cd backend && npm test -- --runInBand` | Pass | Sixty-four focused tests cover profile-update filtering, user/group ownership, group/membership listing boundaries, collection route ownership, invitation actor identity/lifecycle, invite-only joining, notification ownership, meet reads, meet-account-game membership, admin reviewer identity/guard behavior, authentication-request/query validation, deprecated global-user-list protection, deleted-account JWT behavior, database-log redaction, email-log redaction, cache-log redaction, and auth-log redaction; broader authorization coverage remains absent. |
| `cd backend && npm run test:e2e -- --runInBand` | Fail | Test setup throws because `RESEND_API_KEY` is missing; the test itself expects a stale `/` Hello World route. |
| `cd backend && npx eslint "{src,apps,libs,test}/**/*.ts"` | Fail | 17 errors and 3 warnings across schemas, database, collection, play, and profile code. |
| `cd frontend && npm run build` | Pass with warnings | Bundle budget, Sass deprecation, and selector warnings remain. |
| `cd frontend && npx biome check` | Fail | 8 findings in the form submission, log-session wizard, and propose-game page files. |
| `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` | Pass | One generated smoke test passes. |
| `sqlite3 backup-copy < database/migrations/0001-add-clerk-user-id.sql` | Pass | SQLite integrity remains `ok`; 15 accounts, 13 meets, and 101 meet/game links are preserved; the original backup was not used as the test target. |
| Local Clerk Google sign-in plus `GET /auth/clerk/status` | Pass | Clerk session verification succeeded and linked the matching existing live account `#1`; live Turso reports one linked account and preserved admin state. This is a manual development verification, not automated coverage. |

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
- deterministic explainable recommendation scoring;
- atomic session creation, planned/played distinction, completion, and history;
- frontend loading, empty, failure, retry, and mobile/accessibility states.

### P2 delivery quality

- API contract compatibility and response validation;
- provider fakes for Turso/Redis/Resend;
- health/readiness and shutdown behavior;
- browser journey coverage against a clean environment.

## Test isolation rules

Tests must not depend on a developer’s real Turso, Redis, or Resend credentials. Use a disposable database or explicit provider fakes. Do not make a test pass by disabling authorization or using production data. Record any intentionally untested boundary as an explicit exception or deferred gap.

## Completion evidence

A feature task is not complete because the build passes. The task board requires affected checks, authorization/invalid-input evidence where relevant, documentation/API updates, and known follow-ups. See [todo/README.md](../todo/README.md).
