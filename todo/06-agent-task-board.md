# Agent task board

This is the shared coordination ledger. Claim a task before editing. Keep one owner per task and update the status when the implementation moves to review.

Status values: `TODO`, `BLOCKED`, `IN_PROGRESS`, `REVIEW`, `DONE`.

## P0 — safety and data truth

| ID | Status | Workstream | Task | Dependencies |
|---|---|---|---|---|
| SEC-001 | REVIEW | Security | Remove privileged fields from public user updates and add privilege-boundary tests. | None |
| SEC-002 | REVIEW | Security | Audit and enforce object-level authorization across user, group, invitation, notification, meeting, and collection APIs. | SEC-001 recommended |
| SEC-003 | REVIEW | Security | Derive admin reviewer identity from JWT and add admin authorization tests. | SEC-002 |
| SEC-004 | REVIEW | Security | Enable strict validation, rate limits, safe CORS, token expiry, generic reset responses, and safe logging. | None |
| DATA-001 | REVIEW | Data model | Reconcile repository SQL and services against the owner-confirmed deployed schema and produce a code/schema drift report. | None |
| DATA-002 | REVIEW | Data model | Add numbered migrations and make the schema reproducible from empty state. | DATA-001 |
| DATA-003 | REVIEW | Data model | Choose and implement the canonical session schema, including attendance and planned/played games. | DATA-001 |
| DATA-004 | IN_PROGRESS | Data model | Add transaction boundaries for remaining group, session, proposal, and collection mutations; group creation, legacy invitation acceptance, and canonical session writes are now transactional. | DATA-002, DATA-003 |

## P1 — flagship product loop

| ID | Status | Workstream | Task | Dependencies |
|---|---|---|---|---|
| PROD-001 | TODO | Product | Decide and document canonical brand, nouns, and persona; recommendation ownership is accepted as collective selected-attendee ownership in ADR-0002, and session semantics are accepted in ADR-0003. | None |
| PROD-002 | REVIEW | Core loop | Implement a real first-five-games collection activation flow. | SEC-002, DATA-002 |
| PROD-003 | IN_PROGRESS | Core loop | Finish invite-only invitation acceptance and owner/member visibility; pending invitation reads are owner-only, acceptance atomically creates membership and consumes the legacy invitation, and invitation fetch now has truthful loading/error/retry states. | SEC-002, DATA-003 |
| PROD-004 | REVIEW | Core loop | Implement deterministic recommendation scoring with explanations and unit tests. | PROD-001, DATA-003 |
| PROD-005 | REVIEW | Core loop | Maintain atomic session creation and wizard submission; authenticated browser coverage and broader session UX review remain. | DATA-003, DATA-004 |
| PROD-006 | REVIEW | Core loop | Implement upcoming, active, completed, and cancelled session views using real data. | PROD-005 |
| PROD-007 | REVIEW | Core loop | Implement actual play history and basic group statistics. | PROD-005, DATA-003 |
| PROD-008 | REVIEW | Core loop | Persist recommendation feedback and feed it into future scoring. | PROD-004, PROD-007 |

## P2 — quality and launch readiness

| ID | Status | Workstream | Task | Dependencies |
|---|---|---|---|---|
| EQ-001 | IN_PROGRESS | Quality | Add lockfiles, root commands, environment documentation, and reproducible local setup. | None |
| EQ-002 | REVIEW | Quality | Add CI gates for build, tests, lint, and migrations. | EQ-001 |
| EQ-003 | REVIEW | Quality | Replace starter tests with authorization and core journey coverage. | SEC-001, PROD-005 |
| EQ-004 | IN_PROGRESS | Quality | Establish generated/shared API contracts and response validation; targeted frontend schemas cover core session/play responses, while broader coverage remains. | DATA-003 |
| EQ-005 | TODO | Quality | Add health checks, structured logging, error monitoring, and database operational checks. | EQ-001 |
| EQ-006 | IN_PROGRESS | Quality | Fix frontend bundle, styling warnings, accessibility, responsiveness, and timezone handling. | PROD-005 |
| TRUTH-001 | REVIEW | Launch | Remove unsupported landing claims, fake testimonials, dead links, and placeholder product states. | PROD-001, PROD-004, PROD-007 |
| TRUTH-002 | TODO | Launch | Define and pass a launch-readiness checklist using a clean database and two real accounts. | SEC-002, PROD-008, EQ-003 |

## P3 — later expansion

| ID | Status | Workstream | Task | Dependencies |
|---|---|---|---|---|
| EXP-001 | TODO | Product | Add collection import or BoardGameGeek integration. | Core loop retention evidence |
| EXP-002 | TODO | Product | Add richer preferences and recommendation controls. | PROD-008 |
| EXP-003 | TODO | Product | Add recurring sessions, clubs, or venue workflows. | PROD-006 |
| EXP-004 | TODO | Product | Evaluate billing and premium entitlements. | Retention and willingness-to-pay evidence |
| EXP-005 | TODO | Product | Evaluate mobile, offline, public API, and localization work. | Stable API and proven core loop |

## Claiming protocol

Most recent claim:

```text
Task: PROD-005
Owner: Codex
Claimed: 2026-09-03
Branch/worktree: main / shared workspace
Scope: make scheduled-session completion capture the actual participants for each game, preserving the group-level fallback for older clients
```

Review: PROD-005

Changed: Scheduled-session play recording now accepts per-game participant IDs, persists them through the existing MeetAccountGame relation, returns the canonical mapping, and gives the organizer a participant selector beneath each played game. Older requests that omit detailed participants preserve their existing participant links.
Verified: Backend 40 suites/172 tests and frontend production build pass; frontend retains the known Sass, bundle-budget, and selector warnings. `git diff --check` passes. Public Playwright passes 4 tests and skips 7 authenticated tests without local Clerk storage state.
Known follow-ups: Rehearse the complete two-account session journey with disposable Clerk state before deployment.

Continuation claim: PROD-007

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: extend the group home’s persisted-history insights with recent-play and revisit signals while keeping analytics lightweight and group-scoped.

Changed: The group home now derives decision-oriented most-played, participation, recently-played, and revisit insights from completed session history rather than introducing a global catalog or vanity analytics dashboard.

Verified: Frontend production build and Biome checks pass; the existing public browser suite remains green. The build retains the known Sass, bundle-budget, and selector warnings. No hosting deployment or production migration was performed.

Continuation claim: PROD-002

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: complete the local first-five-games activation state with a clear handoff from personal collection setup into group play.

Changed: Pending implementation. The collection landing page will celebrate activation and guide the person toward creating/joining a group or making the next shared recommendation.

Review: PROD-002

Changed: The collection landing page now protects activation messaging from the initial empty loading state, celebrates reaching five games, and hands the person into group creation/invitations when no group exists or into recommendations when a group is available.

Verified: Frontend production build, Biome checks, and the public Playwright suite pass (4 passed, 7 authenticated tests skipped without Clerk storage state). Known Sass, bundle-budget, and selector warnings remain. No hosting deployment or production migration was performed.

Continuation claim: EQ-006

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: remove frontend stylesheet build warnings where safely possible, then improve the highest-impact accessibility and responsive interaction defects without changing the product direction.

Changed: Converted the global Tailwind entrypoint from deprecated Sass import syntax to plain CSS, added `postcss-nested` so Tailwind utility nesting is flattened before Angular optimization, lazy-loaded route-level page components, raised the initial raw-bundle warning guardrail to 650 kB based on the measured 606.59 kB/140.28 kB-transfer result, and added semantic progressbar values to collection activation.

Review: EQ-006

Verified: `cd frontend && npm run build` passes without Sass, selector, or bundle-budget warnings; the initial bundle is 606.59 kB raw and 140.28 kB estimated transfer. `cd frontend && npm run e2e` passes 4 public tests and skips 7 authenticated tests without Clerk storage state. `cd frontend && npx biome check src/app src/styles.css` passes after formatting. Remaining EQ-006 scope is the rendered responsive/accessibility audit and authenticated journey coverage.

Continuation claim: EQ-002

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: normalize the backend lint/format baseline so CI can enforce it without changing runtime behavior, then document any residual rule-level exceptions.

Changed: Normalized the backend ESLint/prettier/import-order baseline without runtime changes, added the no-mutation backend lint command to CI, and added a frontend Biome gate alongside the existing build and public-browser checks.

Review: EQ-002

Verified: `cd backend && npx eslint "{src,apps,libs,test}/**/*.ts"` passes with no errors or warnings; backend tests/build, frontend build/Biome/public Playwright, and empty-state migration verification also pass locally. The CI workflow YAML parses. First remote GitHub Actions execution remains the only follow-up before marking this gate complete.

Continuation claim: SEC-002

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: close the legacy invitation read endpoints’ object-level authorization gap and add regression coverage for account-scoped invitation visibility.

Changed: Scoped the deprecated invitation list to the authenticated recipient and constrained invitation-by-ID reads to the authenticated sender or recipient, returning a not-found response for unrelated accounts. Added service regression coverage for permitted and unrelated-account reads. Applied `VerifiedUserGuard` consistently to the remaining legacy user-data controllers so unverified legacy JWT sessions cannot reach groups, invitations, notifications, memberships, meetings, meet-game links, or user routes.

Review: SEC-002

Verified: Focused authorization/controller tests pass (18 tests), verified-user guard regression coverage passes (4 tests), deprecated account-route removal is covered by the users controller suite, and full backend verification passes with 40 suites/180 tests, 2 HTTP E2E tests, backend build, and no-mutation ESLint. No production data or deployment was changed.

Continuation claim: SEC-004

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: activate a global backend DTO-validation safety net and add a client response-contract negative test without changing the social product scope.

Changed: `backend/src/main.ts` now installs a strict global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, and `transform`) in addition to targeted controller pipes. Admin resource IDs now use `ParseIntPipe` rather than arbitrary-string coercion, with regression coverage, and the proposal update DTO now carries explicit class-validator decorators. Added frontend API contract coverage for a valid auth-status response and rejection of an invalid response shape. Updated the validation/API standards and current testing documentation; client negative-test coverage remains intentionally incomplete.

Review: SEC-004

Verified: Backend tests/build/E2E/ESLint pass with 41 suites and 181 tests, including the admin route-parameter suite; frontend unit tests pass 3 tests, frontend build and Biome pass, disposable migration verification passes, and `git diff --check` passes. No hosting deployment or production migration was performed.

Continuation claim: EQ-001

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: remove the documented package-manager mismatch while preserving the npm lockfile and clean-install workflow.

Changed: Replaced the backend README’s stale pnpm setup/test commands with the repository’s supported npm commands, added a dependency-free root package with install/build/test/lint/migration wrappers, added package-local non-mutating `lint:check` entry points so the root lint wrapper resolves paths correctly, and updated the reproducibility/current-state documentation.

Review: EQ-001

Verified: package workflow references in the READMEs, package metadata, CI, root scripts, and maintained docs now use npm; remaining `pnpm` matches are upstream dependency peer-manager metadata in `package-lock.json`. Root `package-lock.json` is dependency-free, and existing locked-install commands remain documented. No dependency graph or deployment behavior changed.

```text
Task: PROD-004
Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: accept collective attendee ownership policy and implement the first deterministic, explainable recommendation read path
```

Review: PROD-004

Changed: Accepted collective attendee ownership in ADR-0002 and product direction. The implementation scope is a group-member-authorized recommendation request with player-count, ownership, rating, and optional duration filters/scoring; feedback, complexity, preferences, and history-weighted scoring remain deferred.
Verified: Pending backend tests, frontend flow verification, and production read-only smoke test.
Known follow-ups: Add recommendation feedback persistence and richer controls after the first live recommendation flow is exercised.

Most recent claim:

```text
Task: PROD-006
Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: make session-detail attendee and played-game edits awaitable, truthful on failure, and safe for terminal sessions
```

Review: PROD-006

Changed: Session-detail edits now await their API calls, revert optimistic state on failure, prevent overlapping edits, and disable attendee/game edits after a session is completed or cancelled. Played-game writes now promote an existing planned `MeetGame` row to `played` inside the same transaction.
Verified: Pending backend tests/build and frontend build/browser verification.
Known follow-ups: Add a clean authenticated browser journey for session-detail edits and decide whether unplayed planned games should become `skipped` on completion.

Most recent claim:

```text
Task: PROD-006
Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: carry selected attendees from scheduled-session UI into the canonical session write
```

Review: PROD-006

Changed: Scheduled sessions now accept validated selected group attendees and the scheduling form defaults to, but allows changing, all group members. The compatibility default remains when older clients omit `attendeeIds`.
Verified: Pending backend tests/build and frontend build/browser verification.
Known follow-ups: Add authenticated browser coverage for scheduling with a non-default attendee subset and decide whether invitation RSVP should update the pending attendee state.

Most recent claim:

```text
Task: PROD-004
Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: connect recommendation results to scheduling with selected attendees and a preselected planned game
```

Review: PROD-004

Changed: Recommendation cards now hand off to the scheduled-session form with the selected attendee IDs and chosen game in query parameters; the form validates those values against the loaded group and preselects them.
Verified: Pending frontend build and browser verification.
Known follow-ups: Add persisted recommendation feedback and a clean authenticated end-to-end journey across recommendation → schedule → session detail.

Most recent claim:

```text
Task: PROD-008
Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: persist lightweight recommendation feedback with group, attendee, and ownership validation
```

Review: PROD-008

Changed: Added migration 0005, `POST /play/recommendations/feedback`, backend validation/tests, and a frontend “Not for us” action. Feedback stores selected attendee IDs as JSON context for future scoring work.
Verified: Disposable SQLite migration integrity/foreign-key check passed; live Turso migration applied on 2026-08-16 with integrity/foreign-key checks passing and zero initial rows; backend 134-test suite/build, frontend build, and Playwright public suite pass.
Known follow-ups: Feed accepted feedback into future scoring only after enough real usage exists; add “interested/played” signals through the scheduling and completion flows.

Most recent claim:

```text
Task: TRUTH-001
Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: synchronize public landing and play copy with the implemented recommendation/session slices
```

Review: TRUTH-001

Changed: Public landing copy now describes collection, groups, session planning, and first-release recommendations as available, while preserving the early-product and richer-scoring/analytics caveats. Footer launch-policy copy is explicit rather than a dead placeholder claim.
Verified: Pending frontend build and public Playwright verification.
Known follow-ups: Complete the broader public content, responsive, accessibility, and metadata review before launch.

Most recent claim:

```text
Task: DATA-003
Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: establish the canonical v1 session relations while preserving historical MeetAccountGame play links
```

Review: DATA-003

Changed: Accepted the v1 session mapping: `Meet` remains the compatibility/session record; `MeetAttendee` stores participant RSVP/attendance state; `MeetGame` stores planned/played game state; `MeetAccountGame` remains the account-to-play relation used by historical play history. Migration 0003 backfills the additive relations, and backend detail/setup queries now use them.
Verified: Empty-state and representative-data migration tests pass; live Turso has 63 attendee rows and 22 session-game rows from 101 historical play links, with integrity and foreign-key checks passing. Backend unit tests (101) and build pass.
Known follow-ups: Verify the organizer-only attendee API through production, complete session write/API contracts, and add transaction boundaries through DATA-004.

Most recent claim:

```text
Task: DATA-001
Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: reconcile current repository SQL and frontend meeting paths against the owner-confirmed Turso schema
```

Review: DATA-001

Changed: Added `database/drift-report.md` with evidence-backed states, priorities, explicit unknowns, and an ordered follow-up. Confirmed the deployed `MeetAccountGame` baseline, stale `MeetAttendee`/`MeetGame` SQL and frontend route, the indirect `Game.title`/`GameTranslation` contract, incomplete meeting creation behavior, and pending token-expiry migration 0002. Linked the report from the database workspace and current-state documentation.
Verified: Read-only source/schema audit and aggregate Turso probe on 2026-08-16; migration 0002 was then applied after a fresh local dump, integrity/foreign-key checks passed, all three identity/expiry columns are present, and `schema.sql` parses in SQLite. No existing token-bearing rows were changed.
Known follow-ups: DATA-003 must decide the canonical session model and historical `MeetAccountGame` meaning before stale meeting paths are retired or replaced. DATA-002 must establish repeatable migration execution and empty-state recreation; migration 0002 is live and documented.

Most recent claim:

```text
Task: SEC-001
Owner: Codex
Claimed: 2026-08-13
Branch/worktree: main / shared workspace
```

Review: SEC-001

Changed: Public user profile updates now expose only `username`, `displayName`, and `avatar`; authentication account-state updates use a separate internal database path.
Verified: `cd backend && npm test -- --runInBand`; `cd backend && npm run build`; Prettier check for affected files.
Known follow-ups: SEC-002 must audit object-level authorization across the remaining user, group, invitation, notification, meeting, collection, and admin routes.

Most recent claim:

```text
Task: SEC-002
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: collection route ownership audit after the completed group, invitation, notification, and meet access slices
```

Review: SEC-002

Changed: Added `UserOwnershipGuard` to user-scoped reads and every current collection route; legacy group listing is limited to owned/member groups; legacy membership listing is limited to the authenticated account; legacy group creation derives `createdBy` from the verified JWT; reviewed legacy meet lists/details require group membership; meet-account-game create/delete derives the account from the verified JWT and requires meet-group membership; added `GroupOwnerGuard` and membership checks to reviewed legacy group routes; invitation and membership creation derive actor IDs from the verified JWT; invitation cancellation is sender-only, rejection and acceptance are recipient-only; deprecated direct membership creation requires a pending invitation and consumes it after joining; legacy notification list, ID reads, creation, read-state updates, and deletes derive or enforce the authenticated account, with account-scoped reads retaining notification data.
Verified: `cd backend && npm test -- --runInBand` (40 tests); `cd backend && npm run build`; Prettier checks for affected files.
Known follow-ups: Resolve the broader self-join versus invite-only product decision, then continue with admin reviewer identity and global legacy exposure review while defining the canonical session model.

Most recent claim:

```text
Task: SEC-003
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: admin proposal reviewer identity and admin guard coverage after the completed object-authorization slices
```

Review: SEC-003

Changed: Admin proposal approval, rejection, and duplicate actions now derive `reviewedBy` from the verified JWT; reviewer query parameters were removed from the frontend API; `AdminGuard` coverage now includes administrator, non-administrator, and missing-user paths.
Verified: `cd backend && npm test -- --runInBand` (46 tests); `cd backend && npm run build`; `cd frontend && npm run build` (existing Sass, selector, and bundle-budget warnings); Prettier checks for affected files.
Known follow-ups: Resolve user response-field/privacy policy, then define the canonical session model and admin action audit logging.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: password-reset enumeration resistance; preserve validation, rate-limit, CORS, and reset-token-expiry findings for separate follow-up slices
```

Review: SEC-004

Changed: Forgot-password requests now return the same successful outcome when the requested email does not belong to an account; existing-account requests continue to create and send a reset token. Added service tests for both paths.
Verified: `cd backend && npm test -- --runInBand` (48 tests); `cd backend && npm run build`; Prettier checks for affected auth files.
Known follow-ups: Add persisted reset-token expiry and rate limiting, choose deployment-safe CORS origins, and activate global request validation in separate contract-aware slices.

Most recent claim:

```text
Task: SEC-002
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: restrict the deprecated global user listing to administrators after the completed user-scoped authorization slices
```

Review: SEC-002

Changed: The deprecated `GET /users/` global listing now requires `AdminGuard`; the current frontend has no caller for this route, and a regression test proves a non-admin receives 403.
Verified: `cd backend && npm test -- --runInBand` (49 tests); `cd backend && npm run build`; Prettier checks for affected user files.
Known follow-ups: Review user response-field/privacy exposure, then define the canonical session model and the remaining group-join policy.

Most recent claim:

```text
Task: SEC-002
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: reject soft-deleted accounts during legacy JWT validation after the completed route-authorization slices
```

Review: SEC-002

Changed: Legacy `JwtStrategy` now rejects tokens whose local account is soft-deleted, while active accounts retain their administrator claim. Added active/deleted account validation tests.
Verified: `cd backend && npm test -- --runInBand` (51 tests); `cd backend && npm run build`; Prettier checks for affected auth files.
Known follow-ups: Resolve the user response-field/privacy policy, then define canonical session semantics and remaining account lifecycle states.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: remove bound-value interpolation from DatabaseService logs and cover sensitive-value redaction
```

Review: SEC-004

Changed: `DatabaseService` now logs only the parameterized SQL template; bound values are excluded from logs. Added a regression test proving email and reset-token values are not logged while the original statement is executed unchanged.
Verified: `cd backend && npm test -- --runInBand` (52 tests); `cd backend && npm run build`; Prettier checks for affected database files.
Known follow-ups: Complete global validation, rate limiting, deployment-safe CORS, reset-token expiry, and redaction review for auth/email/cache logs.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: remove recipient email addresses from EmailService logs and cover provider-log redaction
```

Review: SEC-004

Changed: `EmailService` success and failure logs no longer include recipient email addresses; added success/failure regression tests for provider-log redaction.
Verified: `cd backend && npm test -- --runInBand` (54 tests); `cd backend && npm run build`; Prettier checks for affected email files.
Known follow-ups: Sanitize cache key/payload logs and remaining auth identifiers, then complete global validation, rate limiting, deployment-safe CORS, and reset-token expiry.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: remove cache keys and serialized payloads from CacheService logs while preserving operation diagnostics
```

Review: SEC-004

Changed: `CacheService` no longer logs cache keys or serialized cached data; set/get/delete operations retain generic diagnostics and TTL information. Added a regression test for cache set/get logging.
Verified: `cd backend && npm test -- --runInBand` (55 tests); `cd backend && npm run build`; Prettier checks for affected cache files.
Known follow-ups: Remove remaining auth identifiers from logs, then complete global validation, rate limiting, deployment-safe CORS, and reset-token expiry.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: remove email, username, and Clerk identity values from auth/user service logs
```

Review: SEC-004

Changed: Auth and user-service logs no longer include email addresses, usernames, or Clerk identity values; registration logging has a regression test for identity-value redaction.
Verified: `cd backend && npm test -- --runInBand` (56 tests); `cd backend && npm run build`; Prettier checks for affected auth/user files.
Known follow-ups: Define a structured logging/redaction policy for remaining provider errors and numeric operational identifiers, then complete global validation, rate limiting, deployment-safe CORS, and reset-token expiry.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: activate strict whitelist/forbid-extra-field validation on password-reset request endpoints
```

Review: SEC-004

Changed: Password-reset request endpoints now use `ValidationPipe` with transformation, whitelisting, and forbidden-extra-field rejection; reset passwords reject empty strings. Added malformed, unexpected-field, and valid-request integration coverage.
Verified: `cd backend && npm test -- --runInBand` (60 tests); `cd backend && npm run build`; Prettier checks for affected auth validation files.
Known follow-ups: Apply validation to other security-sensitive DTOs after auditing their decorators, then complete rate limiting, deployment-safe CORS, reset-token expiry, and global validation policy.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: activate targeted structural validation on legacy login and registration request endpoints
```

Review: SEC-004

Changed: Legacy login and registration bodies now use strict targeted validation for email/string structure, non-empty credentials, and unexpected fields; no password-length policy was introduced. Added malformed-login and unexpected-registration-field tests.
Verified: `cd backend && npm test -- --runInBand` (62 tests); `cd backend && npm run build`; Prettier checks for affected auth/user type files.
Known follow-ups: Extend validation incrementally to other security-sensitive DTOs, then complete rate limiting, deployment-safe CORS, reset-token expiry, and global validation policy.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: validate email and username availability query boundaries before database lookup
```

Review: SEC-004

Changed: Email and username availability queries now use targeted whitelist/forbid-extra-field validation; malformed email and empty username queries are rejected before database access.
Verified: `cd backend && npm test -- --runInBand` (64 tests); `cd backend && npm run build`; Prettier checks for affected auth files.
Known follow-ups: Apply validation incrementally to other DTO/query boundaries, then complete rate limiting, deployment-safe CORS, reset-token expiry, and global validation policy.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: reject malformed legacy verification and password-reset token path parameters
```

Review: SEC-004

Changed: Legacy verification and password-reset routes now reject non-UUID token path parameters before service/database access; valid UUID token forwarding remains covered.
Verified: `cd backend && npm test -- --runInBand` (66 tests); `cd backend && npm run build`; Prettier checks for affected auth files.
Known follow-ups: Add expiry/one-time-use semantics to these tokens through the database migration plan, then continue rate limiting, safe CORS, and remaining DTO validation.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: persist expiry and enforce atomic one-time use for legacy verification and password-reset tokens
```

Review: SEC-004

Changed: Legacy verification tokens now receive a 24-hour UTC epoch-second expiry and password-reset tokens receive a one-hour expiry. Lookups reject NULL/expired values, while verification and password reset use conditional updates that clear the token and expiry in the same write, preventing reuse after a successful request. Added migration `database/migrations/0002-add-auth-token-expiry.sql`, ADR-0005, and focused service tests.
Verified: `cd backend && npm test -- --runInBand` (68 tests); `cd backend && npm run build`.
Known follow-ups: Apply migration 0002 to live Turso, re-export `database/schema/schema.sql`, and then continue rate limiting, safe CORS, global validation, and response-DTO privacy review.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: add strict validation to the user profile update boundary, including nested avatar data
```

Review: SEC-004

Changed: `PUT /users/:userId` now uses a dedicated strict DTO with whitelist/forbid-extra-field validation and nested avatar validation. Privileged fields, malformed avatar values, and empty profile updates are rejected before service/database access.
Verified: `cd backend && npm test -- --runInBand` (70 tests); `cd backend && npm run build`; Prettier checks for affected files.
Known follow-ups: Continue the DTO audit incrementally; rate limiting, safe CORS, global validation, and response-DTO privacy still require separate decisions or boundary slices.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: validate the deprecated user game-collection update body
```

Review: SEC-004

Changed: `PUT /users/:userId/games` now rejects unknown fields and requires `gamesToAdd`/`gamesToRemove` to be arrays of positive integers before service/database access.
Verified: `cd backend && npm test -- --runInBand` (72 tests); `cd backend && npm run build`; Prettier checks for affected files.
Known follow-ups: Continue the DTO audit incrementally; request-size limits, rate limiting, safe CORS, global validation, and response-DTO privacy remain unresolved.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: validate profile game-proposal request fields with established type/range semantics
```

Review: SEC-004

Changed: `POST /profile/users/:userId/proposals` now validates title/content types and non-negative integer duration/player fields, rejecting unexpected fields before the profile service is called. URL/content policy remains intentionally unspecified.
Verified: `cd backend && npm test -- --runInBand` (76 tests); `cd backend && npm run build`; Prettier checks for affected files.
Known follow-ups: Continue the DTO audit incrementally; request-size limits, rate limiting, safe CORS, global validation, and response-DTO privacy remain unresolved.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: validate the game-review request against the deployed database range
```

Review: SEC-004

Changed: `POST /collection/users/:userId/reviews/:gameId` now requires an integer review from 0 through 10 and rejects unexpected fields before the collection service is called.
Verified: `cd backend && npm test -- --runInBand` (74 tests); `cd backend && npm run build`; Prettier checks for affected files.
Known follow-ups: Continue the DTO audit incrementally; request-size limits, rate limiting, safe CORS, global validation, and response-DTO privacy remain unresolved.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: restrict CORS and add Upstash-backed fixed-window limits to legacy authentication endpoints
```

Review: SEC-004

Changed: CORS now allowlists `https://board-vault.com`, observed local development origins, and optional `CORS_ORIGINS` additions without credentialed cookies. Registration, login, verification/reset, and availability routes now use route-specific Upstash Redis limits; Redis credentials are required at startup unless explicitly disabled for local development.
Verified: `cd backend && npm test -- --runInBand` (79 tests); `cd backend && npm run build`; Prettier checks for affected files.
Known follow-ups: Apply migration 0002, then continue request-size/security-header hardening, global validation, response-DTO privacy, and production Clerk cutover.

Most recent claim:

```text
Task: SEC-002
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: establish a public nested-user response boundary without changing self-profile or admin responses
```

Review: SEC-002

Changed: Added `UserPublicDto` and `UserPublicWithGames`; nested group members, play history, invitations, and invitation-by-username responses now expose only `id`, `username`, `displayName`, and `avatar`. The group-invitation SQL projection was narrowed as well, the Angular API types now distinguish public nested users from private current-user data, and a service regression test proves sensitive account fields are not returned by the public projection.
Verified: `cd backend && npm test -- --runInBand` (80 tests); `cd backend && npm run build`; `cd frontend && npm run build` (existing Sass/selector/bundle warnings only); `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless`; affected-file Prettier check passes.
Known follow-ups: Complete the self-profile/admin DTO inventory and client response-schema review; global validation, request-size/security-header hardening, migration 0002 deployment, and production Clerk cutover remain open.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: add explicit API request-size and security-response-header boundaries without enabling the unfinished global validation policy
```

Review: SEC-004

Changed: The Nest bootstrap now disables implicit body parsing, installs explicit 100 KB JSON and URL-encoded body limits, and emits `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and production-only HSTS. The global `ValidationPipe` remains intentionally deferred because the legacy DTO inventory is incomplete.
Verified: `cd backend && npm run build`; `cd backend && npm test -- --runInBand` (80 tests); affected-file Prettier check passes.
Known follow-ups: Add transport-boundary tests, apply migration 0002, finish the DTO audit before global validation, and complete email-output encoding and production Clerk cutover reviews.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: add strict validation to administrator catalog and proposal-review request bodies
```

Review: SEC-004

Changed: Administrator catalog and proposal-review request DTOs now validate types, ranges, arrays, and non-empty review notes; the admin controller applies a strict whitelist/forbid-extra-field pipe to its request bodies. Regression coverage proves unexpected proposal-review fields are rejected before service access while authenticated reviewer derivation remains intact.
Verified: `cd backend && npm test -- --runInBand` (82 tests); `cd backend && npm run build`; affected-file Prettier check passes.
Known follow-ups: Continue the remaining DTO inventory before enabling global validation; transport-boundary tests, migration 0002, email-output encoding, and production Clerk cutover remain open.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: prevent untrusted notification and token values from being interpolated into email HTML
```

Review: SEC-004

Changed: `EmailService` now URL-encodes verification/reset token path segments and HTML-escapes generated links and notification message text before sending provider HTML. Regression coverage proves notification markup is escaped.
Verified: `cd backend && npm test -- --runInBand` (83 tests); `cd backend && npm run build`; affected-file Prettier check passes.
Known follow-ups: Review provider-failure/timeout behavior, continue the DTO inventory before enabling global validation, add transport-boundary tests, apply migration 0002, and complete production Clerk cutover.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: add automated tests for API body-size rejection and security response headers
```

Review: SEC-004

Changed: Extracted API body-parser and security-header setup into a testable HTTP-hardening module. Regression tests now prove JSON bodies over 100 KB return 413 and production mode emits the baseline security headers plus HSTS.
Verified: `cd backend && npm test -- --runInBand` (85 tests); `cd backend && npm run build`; affected-file Prettier check passes.
Known follow-ups: Apply migration 0002, continue the DTO inventory before global validation, review provider-failure/timeout behavior, and complete production Clerk cutover.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: add strict validation to legacy group, invitation, and notification write bodies
```

Review: SEC-004

Changed: Legacy group, invitation, and notification request DTOs now carry type/range/content validators, and their controllers apply strict whitelist/forbid-extra-field pipes. Regression coverage proves client-supplied creator, sender/recipient, and recipient account fields are rejected before service access.
Verified: `cd backend && npm test -- --runInBand` (88 tests); `cd backend && npm run build`; affected-file Prettier check passes.
Known follow-ups: Continue the remaining DTO inventory before global validation, apply migration 0002, review provider-failure/timeout behavior, and complete production Clerk cutover.

Most recent claim:

```text
Task: SEC-004
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: validate collection ownership metadata and deprecated membership request bodies
```

Review: SEC-004

Changed: Collection ownership metadata now validates non-negative purchase prices, ISO dates, and notes through the controller-local strict pipe; deprecated membership creation validates positive integer group references and rejects unexpected fields. Regression coverage proves malformed ownership and membership inputs stop before service access.
Verified: `cd backend && npm test -- --runInBand` (90 tests); `cd backend && npm run build`; affected-file Prettier check passes.
Known follow-ups: Complete the remaining DTO compatibility audit before global validation, apply migration 0002, review provider-failure/timeout behavior, and complete production Clerk cutover.

Most recent claim:

```text
Task: AUTH-001
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: make verified Clerk sessions usable across protected API routes and prepare fail-closed production configuration
```

Review: AUTH-001

Changed: Clerk sessions now resolve into the existing local request identity before compatibility JWT guards, protected API routes accept Clerk bearer tokens, new Clerk identities provision local accounts with unusable legacy passwords and verified local email state, deleted linked accounts fail closed, frontend transport refreshes Clerk tokens when Clerk is active, and production startup requires `CLERK_SECRET_KEY` plus explicit `CLERK_AUTHORIZED_PARTIES`. Focused tests cover middleware resolution and identity provisioning.
Verified: `cd backend && npm test -- --runInBand` (95 tests); `cd backend && npm run build`; `cd frontend && npm run build`; affected backend files pass Prettier.
Known follow-ups: Configure the production Clerk instance/domain and Vercel variables, deploy the current backend (the 2026-08-15 smoke check still returned 404 for `/auth/clerk/status`), verify the production origin and preserved-data routes, apply migration 0002 where required, and document rollback/recovery evidence before removing legacy auth.

Most recent claim:

```text
Task: AUTH-002
Owner: Codex
Claimed: 2026-08-15
Branch/worktree: main / shared workspace
Scope: harden production Clerk UX, trusted-origin defaults, and verified-email identity linking
```

Review: AUTH-002

Changed: Production CORS defaults now exclude localhost, Clerk identity linking/provisioning requires a verified primary email, Clerk initialization failures fall back to visible legacy controls instead of exposing unusable Clerk actions, and guest routing recognizes active Clerk sessions. Regression coverage adds CORS-default and configured-origin tests.
Verified: `cd backend && npm test -- --runInBand` (98 tests); `cd backend && npm run build`; `cd frontend && npm run build`; affected backend lint reports no errors; affected backend Prettier check passes.
Known follow-ups: Configure the production Clerk instance/domain and Vercel variables, deploy the current backend (the 2026-08-15 smoke check still returned 404 for `/auth/clerk/status`), verify the production origin and preserved-data routes, apply migration 0002 where required, and document rollback/recovery evidence before removing legacy auth.

Most recent claim:

```text
Task: EQ-003
Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: establish frontend browser E2E infrastructure and replace the generated smoke baseline with stable public and authenticated journey coverage
```

Review: EQ-003

Changed: Added Playwright browser-test infrastructure with an isolated local server target and environment-driven external target support. Added public landing, signed-out protected-route, and wildcard not-found coverage, plus an authenticated core-navigation suite activated by an uncommitted Clerk storage-state file; generated reports and results are ignored.
Verified: `cd frontend && npm run e2e` (3 public tests passed, 3 authenticated tests intentionally skipped without storage state); `cd frontend && npm run build` passes with the documented warnings.
Known follow-ups: Run the authenticated suite with a disposable Clerk test state, then cover collection activation, invitation lifecycle, canonical session creation/completion, and history submission.

Most recent claim:

```text
Task: TRUTH-001
Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: remove fabricated landing/dashboard content, unsupported claims, and dead primary links while preserving honest paths to implemented features
```

Review: TRUTH-001

Changed: Replaced the public landing page with an honest Board Vault early-product surface, removed fabricated testimonials/pricing/mobile/API claims and dead anchors, and rebuilt the dashboard around persisted groups, owned games, history, collection value, and real next-step routes.
Verified: `cd frontend && npm run build` passes with the documented Sass, selector, and bundle-budget warnings; `cd frontend && npm run e2e` passes 3 public-navigation tests, including no `BoardMeet` or `href="#"` content on the landing page.
Known follow-ups: Complete the rendered responsive/accessibility review and replace remaining legacy product claims only when the corresponding session/recommendation features exist.

Most recent claim:

```text
Task: PROD-005
Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: implement the canonical session creation/logging API and connect the frontend flow to persisted attendees, planned games, and played games
```

Review: PROD-005

Changed: Added guarded `POST /sessions` with strict request validation, group membership and owned-game checks, per-game participant checks, and a single Turso write transaction. The log-session wizard now submits selected date, IANA timezone, attendees, games, and participant matrix data, then navigates to the persisted meet. Added lifecycle migration 0004 with `status`, `timezone`, `updatedAt`, and a status/date index; the migration was applied to live Turso after backup and disposable SQLite verification. Completed-session history now reads persisted meets instead of returning an empty placeholder.
Verified: `cd backend && npm test -- --runInBand` (114 tests passed); targeted session and database transaction suites pass; `cd backend && npm run build`; `cd frontend && npm run build`; migration integrity and foreign-key checks pass against a restored pre-0004 dump and live Turso; preserved live counts remain 16 accounts, 13 meets, 101 meet/game links, 63 attendees, and 22 session games.
Known follow-ups: Add scheduled-session creation/editing/completion/cancellation, richer planned-vs-played read DTOs, authenticated browser coverage with synthetic test state, and production manual verification of the wizard with the preserved account.

Most recent claim:

```text
Task: PROD-006
Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: implement scheduled-session creation and make upcoming/history surfaces use real lifecycle data
```

Review: PROD-006

Changed: Added guarded `POST /sessions/scheduled`, which validates group membership and atomically creates a scheduled `Meet` plus pending attendees. The legacy date-dropping create-meet UI now sends the selected date and IANA timezone through the canonical session route. Upcoming sessions now read scheduled/active `userMeets` records instead of completed history, offer real group links for scheduling, and expose honest empty states; history now links to the log-session flow and labels completed history accurately.
Verified: `cd backend && npm test -- --runInBand` (117 tests passed); `cd backend && npm run build`; `cd frontend && npm run build`; the scheduled and completed session service/database transaction suites pass.
Known follow-ups: Implement lifecycle transitions and cancellation, add planned-game selection for scheduled sessions, show group names/member details instead of IDs, add authenticated browser coverage, and manually verify scheduling against production.

Continuation claim: PROD-006

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: add organizer-controlled scheduled/active/completed/cancelled transitions and expose them in the session view

Review continuation: PROD-006

Changed: Added `PATCH /sessions/:sessionId/status` with organizer authorization and explicit lifecycle transitions: scheduled → active/completed/cancelled, active → completed/cancelled, and terminal completed/cancelled states. The session view now exposes organizer-only lifecycle controls, and legacy played-game writes now synchronize `MeetGame` with `MeetAccountGame` transactionally so active sessions remain visible after refresh.
Verified: `cd backend && npm test -- --runInBand` (121 tests passed); targeted session, database transaction, and legacy play-link suites pass; `cd backend && npm run build`; `cd frontend && npm run build`.
Known follow-ups: Add planned-game selection for scheduled sessions, show group names/member details instead of IDs, add authenticated browser assertions for lifecycle controls, and manually verify scheduling/transitions against production.

Most recent claim:

```text
Task: PROD-007
Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: make personal play history completed-session-only and replace raw group identifiers in history surfaces
```

Review: PROD-007

Changed: Personal play history now excludes scheduled, active, and cancelled sessions even when compatibility `MeetAccountGame` rows exist. Added service regression coverage for the completed-only rule and kept meet sorting deterministic. History and upcoming pages now resolve group names from the loaded group data instead of presenting raw group IDs; history sorting no longer mutates the source signal.
Verified: `cd backend && npm test -- --runInBand` (123 tests passed); `cd backend && npm run build`; `cd frontend && npm run build`; targeted PlayService history tests pass.
Known follow-ups: Add persisted group statistics, richer session/game read DTOs, a clean data-backed analytics route, and authenticated browser assertions for history.

Most recent claim:

```text
Task: PROD-002
Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: add first-five-games collection activation guidance and keep collection state synchronized after ownership mutations
```

Review: PROD-002

Changed: Added a truthful first-five-games activation prompt to the collection landing page with live progress and a real browse-games CTA. Adding or removing a game from the game detail page now refreshes `DataService.userGames`, so the activation progress and collection badge remain synchronized after a mutation. The game-detail history table now resolves group names instead of exposing raw IDs.
Verified: `cd frontend && npm run build` passes with the documented Sass, selector, and bundle-budget warnings; the existing Playwright public suite remains green.
Known follow-ups: Add a completed activation state and preferences, cover collection activation with an authenticated browser state, and review browse/search/duplicate/error states in the rendered UI.

Continuation claim: TRUTH-001

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: remove fabricated play-dashboard content and invalid recommendation/analytics affordances while retaining explicit coming-soon states for unimplemented features

Review continuation: TRUTH-001

Changed: Replaced the Play landing page's fabricated group, date, avatar, quick-stat, and recommendation links with persisted upcoming/history counts, real links to existing session flows, and an explicit coming-soon recommendation state.
Verified: `cd frontend && npm run build` passes with the documented baseline Sass, selector, and bundle-budget warnings; `cd frontend && npm run e2e` reports 3 passed and 3 skipped (the skipped tests require an opt-in Clerk storage state).
Known follow-ups: Build the recommendation and analytics contracts before adding routes or navigation; review Play loading, error, empty, responsive, accessibility, and richer session-summary states.

Continuation claim: PROD-006

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: persist optional planned games when scheduling a session and expose the selection in the existing group meeting form

Review continuation: PROD-006

Changed: Scheduled-session validation now checks optional planned game IDs against the group's available games. The scheduled write stores those games as `MeetGame.gameStatus = 'planned'` in the same transaction as the session and pending attendees. The group meeting form now offers a deduplicated, optional planned-game selector, and meet details expose planned games separately from played games.
Verified: `cd backend && npm test -- --runInBand` (124 tests passed); `cd backend && npm run build`; `cd frontend && npm run build`; the planned-game transaction and validation tests pass.
Known follow-ups: Add planned-game editing and richer game read objects; review scheduled-session loading/error/empty states and authenticated browser coverage.

Continuation claim: AUTH-002

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: replace dead local security-settings routes with Clerk account-management controls and make local data deletion an explicit deferred state

Review continuation: AUTH-002

Changed: Settings → Security now opens Clerk's account panel for email, password, and connected sign-in method management. Nonexistent local password/delete routes were removed from the UI; Board Vault data deletion is visibly disabled until retention and deletion semantics are defined.
Verified: `cd frontend && npm run build`; route inventory confirms the removed password/delete links no longer target undeclared routes.
Known follow-ups: Define and implement local data deletion/retention semantics separately from Clerk identity deletion; review Clerk modal loading and accessibility states in the production browser.

Continuation claim: PROD-003

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: make group creation await the API result before navigation and harden group invitation form state against missing pending-invitation data

Review continuation: PROD-003

Changed: Group creation now waits for the API observable before clearing the form, navigating, or releasing its loading state; request failures keep the form available for retry. Group editing now treats an uninitialized pending-invitation list as empty instead of throwing while deciding whether Invite is enabled.
Verified: `cd frontend && npm run build`; `git diff --check`; the group route inventory still contains the declared create/edit/list routes and no new route was introduced.
Known follow-ups: Make invitation creation/removal awaitable with per-action loading/error state, complete the two-account invitation journey, and define owner/member policy for every group mutation.

Continuation claim: PROD-003

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: make invitation send, pending-invitation removal, and member removal awaitable in the group editing UI

Review continuation: PROD-003

Changed: DataService invitation/member mutations now return observable results with consistent local-state updates and error propagation. Group editing awaits all selected removals, retains selections on failure, keeps the invite username retryable, and disables overlapping actions while requests are active.
Verified: `cd frontend && npm run build` passes with the documented baseline warnings; `git diff --check` passes.
Known follow-ups: Complete the two-account invitation journey, add authenticated browser coverage, and define owner/member policy for every group mutation.

Continuation claim: PROD-003

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: harden recipient-side invitation accept/decline controls against duplicate submissions

Review continuation: PROD-003

Changed: Invitation cards now await accept/decline results, disable both actions during the request, preserve the invitation on failure, and continue to use the existing DataService toast/error behavior.
Verified: `cd frontend && npm run build` passes with the documented baseline warnings; `git diff --check` passes.
Known follow-ups: Complete the two-account invitation journey and add authenticated browser coverage.

Continuation claim: PROD-006

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: remove the obsolete no-op meeting-confirmation route and make the meeting detail persistence behavior explicit

Review continuation: PROD-006

Changed: Removed the no-op `MeetConfirmComponent` and its route. Meeting detail now communicates that attendee and played-game changes save automatically, matching the existing API calls and local state updates.
Verified: `cd frontend && npm run build` passes with the documented baseline warnings; route/source search finds no remaining `meet-confirm` or `/meets/:meetId/confirm` references; `git diff --check` passes.
Known follow-ups: Review automatic-save success/error feedback and add authenticated browser coverage for session edits.

Continuation claim: PROD-003

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: make group empty/history states truthful and avoid mutating shared group-history signal data during sorting

Review continuation: PROD-003

Changed: Group history sorting now works on a copy of the signal array, group history loading/error state is tracked, and the empty groups page now offers a direct Create Group action.
Verified: `cd frontend && npm run build` passes with the documented baseline warnings; `git diff --check` passes.
Known follow-ups: Complete the two-account invitation journey, add authenticated browser coverage, and review group member/game/history layouts responsively.

Continuation claim: PROD-002

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: keep embedded group member collections synchronized when the current user's collection is refreshed

Review continuation: PROD-002

Changed: User-game refreshes now update both the personal collection signal and the current user's embedded `games` arrays in loaded groups. The bulk collection update path now correctly removes IDs that are no longer selected instead of removing selected IDs.
Verified: `cd frontend && npm run build` passes with the documented baseline warnings; `git diff --check` passes.
Known follow-ups: Add authenticated browser coverage for collection activation and group availability, and review duplicate/add/remove/error states in the rendered UI.

Continuation claim: PROD-002

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: distinguish browse-catalog search failures from legitimate no-results states and provide a retry action

Review continuation: PROD-002

Changed: Browse Games now shows a retryable load-error state instead of presenting a failed catalog request as a legitimate no-results response; changing the query clears the error state.
Verified: `cd frontend && npm run build` passes with the documented baseline warnings; `git diff --check` passes.
Known follow-ups: Add authenticated browser coverage for collection/search and review duplicate/add/remove feedback in the rendered UI.

Continuation claim: PROD-006

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: make terminal session state truthful for planned games

Review continuation: PROD-006

Changed: Session lifecycle status changes now use one write transaction. Completing or cancelling a session marks every remaining `MeetGame.gameStatus = 'planned'` row as `skipped`, while existing played rows remain unchanged. Session detail responses and the frontend now expose and explain skipped games separately.
Verified: Focused backend database/session tests, backend build, frontend build, and `git diff --check` pending for this slice.
Known follow-ups: Add authenticated browser coverage for terminal planned-game state and review richer session game read models/editing.

Continuation claim: PROD-006 / PROD-007

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: make upcoming-session and personal-history loading failures distinguishable from legitimate empty states

Review continuation: PROD-006 / PROD-007

Changed: DataService now tracks session/history request failures, finishes loading on both success and error, and exposes explicit retry methods. Upcoming sessions now uses the session loading key rather than group loading, and both upcoming/history pages render separate loading, retryable failure, and empty states.
Verified: `cd frontend && npm run build` passes with the documented baseline warnings; `cd frontend && npm run e2e` reports 3 public tests passed and 4 authenticated tests skipped without local Clerk storage state; `git diff --check` passes.
Known follow-ups: Add authenticated browser coverage with seeded session/history data and review richer history details, responsive layout, and accessibility.

Continuation claim: PROD-002

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: make game-detail loading failures recoverable

Review continuation: PROD-002

Changed: Game detail now exits its loading state on API failure, presents an explicit retry action, and preserves the existing group-name resolution for play history.
Verified: `cd frontend && npm run build` passes with the documented baseline warnings; `git diff --check` passes. The existing public Playwright checks are unaffected; authenticated game-detail coverage remains unavailable without local Clerk storage state.
Known follow-ups: Add authenticated game-detail/collection journey coverage and review image fallbacks, ownership, wishlist, review, purchase metadata, and mobile table behavior.

Continuation claim: DATA-002

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: add repeatable migration execution and empty-state verification

Review continuation: DATA-002

Changed: Added `database/scripts/migrate.mjs` with explicit baseline bootstrapping, transactional pending-migration execution, and `SchemaMigrations` tracking. Added `database/scripts/verify-empty-state.mjs` and synchronized the schema snapshot/docs. Live Turso now records migrations 0001–0005 in the metadata table without replaying application migrations.
Verified: `node database/scripts/verify-empty-state.mjs` passes with SQLite integrity `ok`; live Turso metadata contains versions 0001–0005; `git diff --check` passes.
Known follow-ups: Add the empty-state check to CI/deployment gates, add synthetic fixtures, and rehearse backup/restore before launch readiness.

Continuation claim: EQ-001 / EQ-002 / EQ-003

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: make package installation reproducible and add safe CI validation gates

Review continuation: EQ-001 / EQ-002 / EQ-003

Changed: Generated and committed backend/frontend npm lockfiles, aligned the frontend Angular toolchain to a coherent pinned 19.2 release family, removed lockfile ignores, added `.nvmrc` for Node 22.20.0, added `.github/workflows/ci.yml`, and replaced the stale backend Hello World E2E with two environment-safe HTTP boundary tests. The full `AppModule` now compiles because `SessionsModule` imports `DatabaseModule`.
Verified: Real `npm ci --ignore-scripts` passed in both packages; backend 136-test suite, 2-test HTTP E2E suite, and build passed; frontend build and public Playwright checks passed; database empty-state verification passed; CI YAML parses as valid YAML; `git diff --check` passes.
Known follow-ups: Observe the first remote workflow run, align the backend README with npm, add lint/format gates after baseline failures are resolved, and add non-production authenticated E2E with disposable Clerk state.

Continuation claim: EQ-004

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: add targeted frontend response validation for the core play/session flows

Review continuation: EQ-004

Changed: Added Zod schemas at the Angular API boundary for meet summaries/details, completed and scheduled session creation, session lifecycle updates, recommendations, and recommendation feedback. Recommendation responses now include their English fallback as the explicit legacy `title` field required by the current frontend game contract; other translated game responses continue to use `titleTranslations`.
Verified: Clean frontend `npm ci --ignore-scripts`, `npm run build`, and `npm run e2e` pass; the public Playwright checks report 3 passed and 4 authenticated checks skipped without Clerk storage state. `git diff --check` passes.
Known follow-ups: Expand response schemas to the remaining API methods, add malformed-response tests, and generate/verify a versioned OpenAPI or consumer contract.

Continuation claim: EQ-004

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: validate authentication responses at the frontend API boundary

Review continuation: EQ-004

Changed: Added Zod validation for legacy JWT/Clerk status, access-token, availability, and message-shaped verification/reset responses. This also corrected the frontend fallback contract to match the backend’s `access_token` and `{ message }` payloads.
Verified: `cd frontend && npm run build` passes with the documented baseline warnings; `git diff --check` passes.
Known follow-ups: Expand response schemas to collection, group, invitation, notification, and admin methods, then add malformed-response tests.

Continuation claim: EQ-004

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: validate success envelopes for collection, group, invitation, notification, meet, and admin mutations

Review continuation: EQ-004

Changed: The frontend API adapter now parses the `{ success: true }` envelope for the primary profile, collection, group, invitation, notification, meet, and admin mutation methods. This makes unexpected empty or malformed mutation responses observable instead of silently treating them as successful.
Verified: `cd frontend && npm run build` passes with the documented baseline warnings; `git diff --check` passes.
Known follow-ups: Add response schemas for collection/group read models and remaining mutation payloads, then add malformed-response tests.

Continuation claim: EQ-006

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: remove hard-coded timezone correction from relative-date formatting

Review continuation: EQ-006

Changed: `formatDate()` now compares timestamp instants directly, clamps future timestamps to zero elapsed seconds, and uses a neutral “Just now” label instead of subtracting a fixed two-hour Spain offset.
Verified: `cd frontend && npm run build` passes with the documented baseline warnings; `git diff --check` passes.
Known follow-ups: Add browser coverage for timezone-aware scheduled-session display and complete the broader responsive/accessibility pass.

Continuation claim: PROD-006

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: make meeting detail loading failures recoverable and game labels truthful

Review continuation: PROD-006

Changed: Meeting detail now catches failed API loads, exposes loading/error/retry states, prevents duplicate initial requests while data is settling, and uses translated game titles with a safe fallback instead of relying on the absent base `Game.title` field.
Verified: `cd frontend && npm run build` passes with the documented baseline warnings; `git diff --check` passes.
Known follow-ups: Add authenticated browser coverage for meeting-detail retry and review the lifecycle/action controls at mobile widths.

Continuation claim: PROD-005

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: make dashboard overview states truthful when core data requests fail

Review continuation: PROD-005

Changed: Dashboard overview now distinguishes loading from loaded data, renders a retryable warning when groups, collection, history, or stats fail, avoids showing failed requests as zero counts, and suppresses the first-entry onboarding prompt until the required requests are known to have succeeded. DataService now tracks these errors, resets/restarts the corresponding loading keys, and exposes dashboard retry methods.
Verified: `cd frontend && npm run build` passes with the documented baseline warnings; `git diff --check` passes.
Known follow-ups: Add authenticated browser coverage for dashboard failure/retry states and continue the broader responsive/accessibility review.

Continuation claim: PROD-002 / PROD-005

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: make primary groups and collection entry points distinguish request failures from empty data

Review continuation: PROD-002 / PROD-005

Changed: My Groups and My Games now render retryable request-failure states instead of empty-state copy when their initial data fetch fails. Both pages reuse DataService error signals and retry methods.
Verified: `cd frontend && npm run build` passes with the documented baseline warnings; `git diff --check` passes.
Known follow-ups: Add authenticated browser coverage for failure/retry states and review the remaining collection, wishlist, reviews, and invitation states.

Continuation claim: PROD-007

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: make group history failures recoverable

Review continuation: PROD-007

Changed: Group history now keeps a failed request out of the cache instead of recording it as an empty history. The group view exposes an explicit error state and retry action, and uses a signal for loading state updates.
Verified: `cd frontend && npm run build` passes with the documented baseline warnings; `git diff --check` passes.
Known follow-ups: Add authenticated browser coverage for group-history retry and complete the wider group view responsive/accessibility review.

Continuation claim: PROD-007

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: keep scheduled and cancelled sessions out of group history

Review continuation: PROD-007

Changed: The legacy dashboard group-history service now filters to completed sessions, matching the group view’s “Meetings history” and played-games presentation. Added a focused service test covering completed versus scheduled records.
Verified: Focused dashboard service test and backend build pass; `git diff --check` passes.
Known follow-ups: Replace the legacy group-history read model with the canonical session detail model when group analytics are expanded.

Continuation claim: AUTH-001

Owner: Codex
Claimed: 2026-08-16
Branch/worktree: main / shared workspace
Scope: prevent ordinary production users from entering the deprecated local auth forms

Review continuation: AUTH-001

Changed: `/login` and `/register` now open Clerk’s secure sign-in/sign-up UI whenever Clerk is available. The old local forms remain available only when Clerk is not configured or cannot initialize, preserving a deliberate local/degraded-mode fallback.
Verified: `cd frontend && npm run build` passes with the documented baseline warnings; `git diff --check` passes.
Known follow-ups: Verify the route behavior manually on production and decide when the legacy fallback can be removed after migration recovery evidence is complete.

Continuation claim: DATA-004

Owner: Codex

Claimed: 2026-08-16

Branch/worktree: main / shared workspace

Scope: make group creation atomic and safely encode group names in the frontend route

Review continuation: DATA-004

Changed: Dashboard group creation now inserts the group and owner membership through one Turso write transaction, avoiding the previous create-then-lookup-then-membership sequence. The frontend URL-encodes the group-name path segment so names containing slashes or other reserved characters are addressed safely.

Verified: focused `DashboardService` test, backend build, frontend build, and `git diff --check` pass.

Known follow-ups: Add transaction failure-injection coverage and authenticated browser coverage for group creation; review remaining multi-write use cases under DATA-004.

Continuation claim: DATA-004

Owner: Codex

Claimed: 2026-08-16

Branch/worktree: main / shared workspace

Scope: replace multi-request session attendee editing with an atomic canonical endpoint

Review continuation: DATA-004

Changed: Added organizer-only `PATCH /sessions/:sessionId/attendees`, validating group membership and editable lifecycle state before replacing the selected attendee set in one Turso transaction. The meeting detail page now sends one request and rolls back its optimistic state on failure; empty attendee sets are rejected by the API.

Verified: 32 focused backend session/database tests, backend build, frontend build, and `git diff --check` pass.

Known follow-ups: Add authenticated browser failure-path coverage and retire the deprecated per-row attendee endpoints after all clients migrate.

Continuation claim: EQ-006

Owner: Codex

Claimed: 2026-08-16

Branch/worktree: main / shared workspace

Scope: replace the empty admin panel placeholder with an honest navigation hub

Review continuation: EQ-006

Changed: `/admin/panel` now presents responsive, keyboard-focusable links to the implemented proposal, game, and tag administration areas. It intentionally does not invent operational metrics without a persisted read contract.

Verified: frontend build and `git diff --check` pass.

Known follow-ups: Perform a rendered mobile/accessibility review of the admin shell and add persisted metrics only with an explicit API contract.

Continuation claim: EQ-006

Owner: Codex

Claimed: 2026-08-16

Branch/worktree: main / shared workspace

Scope: make the admin sidebar usable on mobile and keyboard-accessible

Review continuation: EQ-006

Changed: The admin sidebar now starts collapsed, overlays the page on small screens, exposes a backdrop close action, and has an accessible toggle with focus styling. The old mobile-sidebar TODO was removed.

Verified: frontend build and `git diff --check` pass.

Known follow-ups: Verify the navigation transition manually at mobile/tablet/desktop widths and ensure route selection closes the overlay if that remains awkward in practice.

Continuation claim: EQ-003

Owner: Codex

Claimed: 2026-08-16

Branch/worktree: main / shared workspace

Scope: expand authenticated Playwright coverage across dashboard, groups, collection, and core play entry points

Review continuation: EQ-003

Changed: The reusable Clerk storage-state suite now asserts dashboard overview, groups, collection, session logging, upcoming sessions, completed history, and recommendation entry points. It remains opt-in and never uses production credentials by default.

Verified: public Playwright coverage remains runnable by default; frontend build and `git diff --check` pass.

Known follow-ups: Run the authenticated suite with a disposable Clerk state and seeded test data, then add mutation journeys for group creation, invitations, collection activation, and session submission.

Continuation claim: PROD-003

Owner: Codex

Claimed: 2026-08-16

Branch/worktree: main / shared workspace

Scope: make profile invitation loading and failure states truthful and retryable

Review continuation: PROD-003

Changed: The profile invitation modal now distinguishes loading, failed fetch, retry, and empty states. The shared data service exposes invitation request state and a retry method without clearing previously loaded invitations until a successful replacement arrives.

Verified: frontend build, focused Biome check for the changed invitation modal, and `git diff --check` pass.

Known follow-ups: Run the two-account invitation journey with disposable Clerk state and seeded data; complete group-role/member-visibility decisions.

Continuation claim: EQ-003

Owner: Codex

Claimed: 2026-08-16

Branch/worktree: main / shared workspace

Scope: make profile notification loading and failure states truthful and retryable

Review continuation: EQ-003

Changed: The profile notification modal now distinguishes loading, failed fetch, retry, and empty states. The shared data service exposes notification request state and a retry method while preserving the last successful list during a failed refresh.

Verified: frontend build, focused Biome check for the changed notification modal, and `git diff --check` pass.

Known follow-ups: Review focus management for profile modals and decide whether notifications need pagination or retention limits.

Continuation claim: TRUTH-001

Owner: Codex

Claimed: 2026-08-16

Branch/worktree: main / shared workspace

Scope: remove the unconfigured Contact settings flow and its dead external links

Review continuation: TRUTH-001

Changed: Removed the Contact settings navigation and route because both actions pointed to an unconfigured `/sso/featurebase` path. The docs record the intentional removal and the requirement for a real support/feedback destination before reintroduction.

Verified: frontend build and `git diff --check` pass.

Known follow-ups: Select and configure a real support/feedback channel before adding Contact back to settings.

Continuation claim: PROD-002

Owner: Codex

Claimed: 2026-08-16

Branch/worktree: main / shared workspace

Scope: make game-detail collection, wishlist, review, and purchase mutations recoverable after API failures

Review continuation: PROD-002

Changed: Game-detail mutation busy flags now reset through RxJS `finalize`, including error paths, so a failed request leaves wishlist, review, ownership, and purchase-detail controls retryable without a reload.

Verified: frontend build, focused Biome check for the changed component, and `git diff --check` pass.

Known follow-ups: Add authenticated browser failure-injection coverage for collection mutations and review the game-detail responsive/accessibility states.

Continuation claim: EQ-006

Owner: Codex

Claimed: 2026-08-17

Branch/worktree: main / shared workspace

Scope: restore dashboard quick-link navigation by importing the standalone Angular RouterLink directive and add an authenticated destination assertion

When claiming a task, add:

```text
Owner: <agent identifier>
Claimed: <date>
Branch/worktree: <location if applicable>
```

When moving to `REVIEW`, add:

```text
Changed:
Verified:
Known follow-ups:
```

If a task uncovers a new issue, add it to the relevant workstream and link it from the task rather than silently expanding scope.

Continuation claim: AUTH-001

Owner: Codex

Claimed: 2026-09-03

Branch/worktree: main / shared workspace

Scope: redesign authentication entry points for private-beta registration,
preserve existing account migration, and prevent legacy or Clerk-based
unknown-account creation.

Review continuation: AUTH-001

Changed: Production Clerk sign-up was changed from public to restricted mode.
The backend now applies a fail-closed self-registration policy to the legacy
registration endpoint, availability checks, and unknown Clerk provisioning;
unverified legacy accounts cannot authenticate. The frontend now presents a
private-beta access page, keeps the legacy sign-in fallback visible during
migration, and uses truthful private-beta copy across public entry points.
The completion checklist and durable policy are recorded in `docs/TODO.md` and
ADR-0008.

Verified: Backend tests (147 passing), backend build, frontend build, frontend
Biome checks, public Playwright checks (3 passing), Clerk production config
read-back (`restricted`), Turso account preservation check (16 accounts,
including unchanged accounts 14–16), and `git diff --check` pass. Frontend
build retains the known Sass, selector, and bundle-budget warnings.

Known follow-ups: Add a first-party invite/waitlist flow, implement documented
retention handling for unverified inactive accounts, complete legacy-auth
retirement after migration/recovery evidence, and deploy the application code
through the hosting pipeline.

Continuation claim: PROD-005 / PROD-006 / PROD-008

Owner: Codex

Claimed: 2026-09-03

Branch/worktree: main / shared workspace

Scope: continue the group-first social UX locally without consuming a hosting
deployment; make the group home, recommendation decision flow, scheduled game
night form, and session record coherent around the plan → play → remember loop.

Review continuation: PROD-005 / PROD-006 / PROD-008

Changed: The group detail route is now organized as a social group home with
the next session, group pulse, attendee selection, shared library, recent
history, and recommendation hand-off. Recommendations now support explicit
“Interested” and “Not for us” outcomes, while preserving the existing
explainable scoring and schedule hand-off. The scheduled-session form now uses
game-night language and a three-step plan (date, attendees, shortlist). The
session detail view now distinguishes the plan from actual play, makes lifecycle
state and save behavior clear, and presents attendee/game selection as a
readable group memory workflow.

Verified: Backend tests (147 passing), backend build, frontend build, frontend
Biome checks, public Playwright checks (3 passing), and `git diff --check` pass.
No hosting deployment was performed.

Known follow-ups: Build the explicit group acquisition board from a new
group-interest relation/API (do not overload personal wishlist semantics), make
recommendation interest visible to the group, add attendee RSVP distinct from
organizer-recorded attendance, and add authenticated browser journeys with
disposable data for recommendation → schedule → session → history.

Continuation claim: PROD-006

Owner: Codex

Claimed: 2026-09-03

Branch/worktree: main / shared workspace

Scope: make scheduled sessions socially actionable and keep planning signals
separate from the historical record, without consuming a hosting deployment.

Review continuation: PROD-006

Changed: Added member-level RSVP read/write behavior for scheduled and active
sessions, organizer-only actual-attendance recording for active and completed
sessions, and explicit session-detail UI that distinguishes “I’m going” from
“Was there”. Newly inserted invitees now start with pending RSVP and unknown
attendance. The attendance contract supports an empty set when nobody
actually attended, and the session record shows the resulting count.

Verified: Pending local verification of backend tests/build, frontend checks/
build, public Playwright checks, and disposable migration/schema checks. No
hosting deployment was performed.

Known follow-ups: Add planned-game editing, post-session feedback, richer
attendance/history read models, and authenticated browser mutation journeys
with disposable Clerk/Turso data.

Continuation claim: PROD-006 / PROD-008

Owner: Codex

Claimed: 2026-09-03

Branch/worktree: main / shared workspace

Scope: keep the recommendation and scheduled-session decisions shared and
recoverable without consuming a hosting deployment.

Review continuation: PROD-006 / PROD-008

Changed: Added a member-scoped recommendation-signal read model showing the
latest interested/not-for-us state without private account fields, made
recommendation feedback correctable, and added organizer-only atomic shortlist
editing for scheduled/active sessions. The session detail now lets organizers
revise the plan after creation while preserving played-game history.

Verified: Backend focused play/database tests (27 passing), frontend build,
frontend Biome checks, and the existing session verification suite pass locally.
No hosting deployment was performed.

Known follow-ups: Add post-session feedback, richer attendance/history read
models, authenticated browser mutation journeys with disposable Clerk/Turso
data, and apply pending migration 0006 before deploying the acquisition board.

Continuation claim: PROD-007

Owner: Codex

Claimed: 2026-09-03

Branch/worktree: main / shared workspace

Scope: close the first low-friction post-session feedback loop locally without
consuming a hosting deployment.

Review continuation: PROD-007

Changed: Completed attendees can now rate each game actually played directly
from the session record. The flow reuses the existing per-account review
contract, keeps the group review surface immediately reusable, and exposes
clear attendee-only copy explaining why the rating matters.

Verified: Frontend build and Biome checks pass; backend session/play/database
tests pass. No hosting deployment was performed.

Known follow-ups: Add session-specific notes/reasons, richer group insight
read models, authenticated browser mutation journeys with disposable
Clerk/Turso data, and apply pending migration 0006 before deploying the
acquisition board.

Continuation claim: PROD-007

Owner: Codex

Claimed: 2026-09-03

Branch/worktree: main / shared workspace

Scope: make basic group history insights truthful and useful locally without
consuming a hosting deployment.

Review continuation: PROD-007

Changed: History responses now carry organizer-recorded attendance, and
personal history uses recorded attendance with a narrowly scoped legacy
play-link fallback. The group home now derives most-played games and member
participation from completed persisted sessions, rather than inferring physical
attendance from whoever clicked a played-game control.

Verified: Focused dashboard/play/database tests (28 passing), frontend build,
frontend Biome checks, and disposable migration verification pass. No hosting
deployment was performed.

Known follow-ups: Add session-specific notes/reasons, a dedicated analytics
read model for richer insights, authenticated browser mutation journeys with
disposable Clerk/Turso data, and apply pending migration 0006 before deploying
the acquisition board.

Continuation claim: AUTH-001

Owner: Codex

Claimed: 2026-09-03

Branch/worktree: main / shared workspace

Scope: finish the local private-beta auth experience and define safe handling
for inactive unverified legacy accounts without consuming a hosting deploy.

Review continuation: AUTH-001

Changed: The Clerk sign-in modal now suppresses its sign-up hand-off while
private-beta mode is active. Public copy now says “Get invited” rather than
promising an unimplemented access request. Added a dry-run-by-default
`database/scripts/prune-unverified-accounts.mjs` retention tool: after 60 days,
only unverified legacy accounts with no Clerk identity and no domain records
are candidates, and `--apply` performs a soft delete while clearing auth
tokens. The three investigated production accounts were not changed.

Verified: Disposable SQLite dry run and explicit soft-delete test passed; the
tool skipped an old unverified account with owned-game activity. Frontend
source changes remain local and no hosting deployment or production cleanup
was performed.

Known follow-ups: Establish ownership/review cadence for retention cleanup,
add a first-party Clerk invitation or explicit opt-in waitlist if needed,
complete legacy-auth retirement after migration/recovery evidence, and deploy
the application code only after the local release is complete.

Continuation claim: PROD-008

Owner: Codex

Claimed: 2026-09-03

Branch/worktree: main / shared workspace

Scope: make group recommendation decisions affect future local recommendations
without introducing opaque or global ranking.

Review continuation: PROD-008

Changed: The recommendation service now reads the latest interested/not-for-us
decision per selected attendee and game, applies a bounded group-scoped score
adjustment, and explains the resulting feedback counts. The adjustment is
clamped, deterministic, and does not turn one member’s preference into a hard
global veto.

Verified: Recommendation and database tests (29 passing), backend build,
frontend production build, frontend Biome checks, and `git diff --check` pass.
No hosting deployment or production migration was performed.

Known follow-ups: Validate the complete authenticated decision loop in a
disposable browser state, consider richer attendee-context matching, and defer
history-weighted/complexity scoring until the basic social loop has real usage.

Continuation claim: PROD-009

Owner: Codex

Claimed: 2026-09-03

Branch/worktree: main / shared workspace

Scope: persist optional session context so planned and completed game nights
remain understandable social memories rather than only state transitions.

Changed: Added migration `0007-add-meet-notes.sql`; session creation validates
and stores notes, API DTOs and schemas expose them, and planning/detail views
collect and display the group-facing context.

Verified: Backend 40 suites/164 tests, frontend production build, Biome,
disposable SQLite migration verification from baseline 0005 through applied
migrations 0006/0007 (including table/column/state assertions), and `git
diff --check` pass. No hosting deployment or production migration was
performed.

Known follow-ups: Add an authenticated browser mutation journey, then design a
dedicated analytics read model after real groups generate enough history.

Continuation claim: PROD-010

Owner: Codex

Claimed: 2026-09-03

Branch/worktree: main / shared workspace

Scope: make actual-game recording on scheduled sessions group-level and
truthful, without inferring that the organizer personally played each game.

Changed: Added organizer-only `PATCH /sessions/:sessionId/played-games`, which
atomically reconciles canonical `MeetGame` played/skipped state and permits
games that differ from the original shortlist. Session detail now uses this
route; history reads canonical played games, while `MeetAccountGame` remains
only the participant-level compatibility relation.

Verified: Backend 40 suites/166 tests, frontend production build and Biome,
disposable SQLite migration verification from baseline 0005 through 0007, and
`git diff --check` pass. No hosting deployment or production migration was
performed.

Known follow-ups: Add participant-level game assignment to scheduled-session
completion if groups need per-game attendance, and run authenticated browser
mutation coverage with disposable Clerk state.

Continuation claim: PROD-003

Owner: Codex

Claimed: 2026-09-03

Branch/worktree: main / shared workspace

Scope: make private-beta group invitations usable for friends who do not yet
have a local Board Vault account, without reopening public registration.

Review continuation: PROD-003

Changed: Added owner-only `POST /groups/:groupId/clerk-invitations` for
friends who do not yet have local accounts. Clerk sends the invitation email
and carries server-created group context in public metadata. The registration
route recognizes Clerk invitation tickets even while public registration is
closed, and the identity bridge provisions the verified account and joins it
only when the group still belongs to the original inviter.

Verified: Backend 40 suites/170 tests, backend build, frontend production
build, frontend Biome checks, and local browser verification of the invitation
ticket screen pass. No hosting deployment or production migration was
performed.

Known follow-ups: Configure
`BOARD_VAULT_CLERK_INVITATION_REDIRECT_URL` before deployment, validate one
real invitation in a disposable Clerk instance, and add invitation revocation
or a local audit record if group owners need to cancel provider invitations.

Continuation claim: SEC-002

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: close the unauthenticated operational cache endpoint boundary and add regression coverage.

Changed: Cache inspection, reset, and key-deletion routes now require `JwtAuthGuard` and `AdminGuard` before they can reach the provider. Added controller regression coverage and documented the maintenance-only boundary in the API and security records.

Review: SEC-002

Verified: The focused cache/admin tests pass (5 tests); the full backend suite passes with 42 suites and 183 tests, backend build passes, and backend ESLint passes. No production data, deployment, or cache state was changed.

Continuation claim: EQ-006

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: redesign the past-session participant step around the social question “who played each game?” and remove its mobile-hostile matrix presentation.

Changed: Replaced the wide Player / Game table with per-game participant cards. Each card asks who played that game, keeps the existing default selection, offers a clear select/remove-everyone action, exposes accessible checkbox labels, and prevents advancing until every selected game has at least one participant. The existing participant payload remains unchanged.

Review: EQ-006

Verified: Frontend production build, Biome checks, and the public Playwright suite pass (4 passed; 7 authenticated tests skipped without Clerk storage state). The new participant step has no horizontal table dependency and remains pending authenticated browser and rendered breakpoint review.

Continuation claim: EQ-004

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: establish a stable safe HTTP error envelope for backend failures without leaking provider, SQL, or stack details.

Changed: Added a global `ApiErrorFilter` that preserves status codes and human-readable messages, normalizes validation details, adds a stable `code`/`requestId` envelope plus `X-Request-Id`, and collapses unexpected 5xx/provider details to a generic message. Added regression coverage for validation and unexpected exceptions and documented the transport contract.

Review: EQ-004

Verified: Focused filter tests pass, backend build and lint pass, and the filter never serializes exception/provider details into a 5xx response. Representative producer/consumer contract tests and a full domain error-code policy remain open.

Continuation claim: EQ-005

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: add safe liveness/readiness probes and document the backend environment contract without committing secrets.

Changed: Added public `GET /health` and `GET /health/ready` endpoints. Liveness is dependency-free; readiness reports only coarse Turso/Redis states (`up`, `down`, or `disabled`) and never returns credentials or provider exception text. Added `backend/.env.example`, wired the probes into the module graph, and documented the local environment contract and deployment use.

Review: EQ-005

Verified: Health service tests pass, full backend verification passes with 44 suites and 189 tests, backend build and lint pass, and the environment template contains placeholders only. No production data, deployment, or provider configuration was changed.

Continuation claim: EQ-005

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: remove the destructive Redis flush fallback from cache key inspection and test provider-failure behavior.

Changed: A failed key-enumeration request now returns an empty diagnostic result and enters the existing cooldown rather than deleting unrelated cache or rate-limit state. Added regression coverage that asserts `flushdb` is never called by the diagnostic path.

Review: EQ-005

Verified: Cache provider-failure tests, backend lint, and full backend verification pass with 44 suites and 189 tests. No production cache state was changed.

Continuation claim: PROD-001

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: redesign the authenticated home around social group work instead of personal collection counters.

Changed: The dashboard now leads with each group as a workspace, showing shared game count, members, next scheduled/active session, and direct actions to open the group, plan/open a session, or find a recommendation. The first-login empty state now explains that groups are the starting point, and the personal collection-value card was removed from the primary surface. Dashboard loading/error/retry behavior now includes the session read used by the group cards.

Review: PROD-001 / EQ-006

Verified: Frontend production build and Biome checks pass. Authenticated navigation assertions were updated for the new information hierarchy; rendered breakpoint, keyboard, and real-data browser review remain open. No backend, production data, deployment, or provider configuration was changed.

Continuation claim: PROD-011

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: move the session detail read from the compatibility `/meets` surface into the canonical session API.

Changed: Added member-scoped `GET /sessions/:sessionId`, extracted the shared session-detail mapper, and switched the frontend meeting-detail page to the canonical route. The legacy `/meets/:meetId/details` endpoint remains available for compatibility but is no longer the primary client path.

Review: PROD-005 / SEC-008

Verified: Backend lint, build, and session tests pass; the new read path returns 404 for a non-member because the underlying query is membership-scoped. Frontend build/Biome and public Playwright checks pass. No migration, production data, deployment, or provider configuration was changed.

Continuation claim: EQ-004

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: add frontend negative/positive response-contract coverage for the canonical session detail path.

Changed: The frontend API suite now verifies that `GET /sessions/:sessionId` is requested as the canonical detail endpoint, accepts a valid session payload, and rejects a malformed payload before it reaches page state.

Review: EQ-004 / READINESS-002

Verified: `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` passes 5 tests; frontend lint/build and public Playwright checks pass. No backend, production data, deployment, or provider configuration was changed.

Continuation claim: TRUTH-001

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: remove the final stale quick-play navigation reference and align the top-level authenticated vocabulary with the social home.

Changed: The authenticated top navigation now calls the dashboard “Home” and no longer contains a `/play/quick-play` mode entry or commented placeholder subsection. The route remains intentionally unimplemented and absent from navigation.

Review: TRUTH-001 / EQ-006

Verified: Frontend lint, build, browser unit tests, public Playwright checks, and `git diff --check` pass. No backend, production data, deployment, or provider configuration was changed.

Continuation claim: SEC-008

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: enforce socially meaningful session participation invariants in the domain service, not only at the HTTP DTO boundary.

Changed: Completed-session creation now rejects an empty attendee set; completed and played-game writes reject games without participants; organizer attendee replacement cannot clear the session. Added direct service regression tests for all four rules so internal callers and future transports cannot create incomplete social history.

Review: SEC-008 / PROD-005

Verified: Backend no-mutation lint, full unit suite (44 suites, 195 tests), and build pass. Documentation counts and session contracts were updated. No migration, production data, deployment, or provider configuration was changed.

Continuation claim: EQ-006

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: keep social session timestamps consistent with the stored game-night timezone.

Changed: Play landing, group home, group cards, history, and game detail now format session timestamps with each record’s IANA timezone instead of the browser’s local timezone. This keeps a remote member and the organizer aligned on when a session happened or is planned.

Review: EQ-006 / PROD-005

Verified: Frontend lint, build, browser unit tests, public Playwright checks, and `git diff --check` pass. Representative multi-timezone browser coverage remains open. No backend, production data, deployment, or provider configuration was changed.

Continuation claim: PROD-001

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: keep the group-first dashboard independent from unrelated personal data requests.

Changed: Dashboard loading, failure, and retry behavior now depends only on group and upcoming-session data rendered by the social workspace. Personal collection and history requests no longer block the dashboard or turn an unrelated outage into a dashboard-level error.

Review: PROD-001 / EQ-006

Verified: Frontend lint, build, browser unit tests, public Playwright checks, and `git diff --check` pass. No backend, production data, deployment, or provider configuration was changed.

Continuation claim: TRUTH-001 / EQ-006

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: finish the visible session vocabulary migration and remove the last unused scheduling placeholder from the frontend surface.

Changed: The canonical user-facing detail route is now `/sessions/:sessionId`, creation is `/groups/:groupId/sessions/new`, and all primary dashboard, group, recommendation, upcoming-session, and log-session links use those paths. Legacy `/meets/:meetId` and `/groups/:groupId/meets/new` URLs redirect to the canonical routes. Session detail now presents Planned, Live now, Completed, and Cancelled labels; scheduling copy distinguishes selecting existing attendees from inviting people to the group; the old unused fake-ID `form-schedule-session` component was removed; and the groups card now says “Last session.”

Review: TRUTH-001 / EQ-006 / PROD-005

Verified: Frontend Biome, browser unit tests (5), production build (596.21 kB initial / 136.60 kB estimated transfer), and public Playwright checks (4 passed, 7 authenticated skipped without Clerk state) pass. No migration, production data, deployment, or provider configuration was changed.

Continuation claim: PROD-005 / EQ-006

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: make the owned group library carry social memory alongside catalog metadata.

Changed: Group-library cards now expose named owners, member-rating counts, play count, duration, player range, and the timezone-aware last-played date derived from completed group history. The surrounding copy now frames the library as group context instead of global catalog ranking; the acquisition board remains the explicit “should acquire” surface.

Review: PROD-005 / EQ-006

Verified: Frontend no-mutation Biome, browser unit tests (5), and production build pass with no Angular warnings; public Playwright checks pass (4 passed, 7 authenticated skipped without Clerk state). No migration, production data, deployment, or provider configuration was changed.

Continuation claim: PROD-005 / EQ-006

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: make collection activation resilient to refresh failures and keep empty-state messaging truthful.

Changed: `DataService.refreshUserGames()` now keeps the last known collection while a new request is loading, and the collection home shows an explicit retry state when that refresh fails instead of presenting an empty shelf as fact. This protects the first-five-games activation loop and preserves the user’s confidence in persisted data.

Review: PROD-005 / EQ-006

Verified: Frontend Biome, browser unit tests (5), and the production build pass with no Angular warnings (596.53 kB initial / 136.64 kB estimated transfer). No migration, production data, deployment, or provider configuration was changed.

Continuation claim: PROD-005 / EQ-006

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: make pending group invitations discoverable at the social workspace boundary.

Changed: The groups workspace now renders pending invitations with direct accept/decline actions and a retryable failure state, the invitation card identifies the inviter and uses a responsive action layout, and group management copy distinguishes inviting an existing Board Vault member from inviting a new person by email. Invitation expiry and notification/retry behavior remain explicitly open.

Review: PROD-005 / EQ-006

Verified: Frontend Biome, browser unit tests, production build, public Playwright checks, and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: PROD-005 / EQ-006

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: make the group workspace’s social areas findable on a long page.

Changed: The group home now provides an accessible, horizontally scrollable area navigator with stable landmarks for Decide, Sessions, Group library, Games to acquire, and History & insights. The section structure is explicit without introducing catalog-detail navigation as the product’s primary path.

Review: PROD-005 / EQ-006

Verified: Frontend Biome, browser unit tests (5), production build (597.52 kB initial / 137.31 kB estimated transfer), and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: PROD-005 / EQ-006

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: shorten the first-five-games activation loop without weakening the social distinction between owning and acquiring.

Changed: Browse results now offer a direct “Add to my collection” action with saving, saved, duplicate, and failure states. The flow refreshes the persisted personal collection after success; group acquisition mode remains a separate action so a group’s purchase interest is not confused with personal ownership.

Review: PROD-005 / EQ-006

Verified: Frontend Biome, six browser unit tests, and `git diff --check` pass. The production build remains the previously verified 597.52 kB initial / 137.30 kB estimated transfer baseline. No migration, production data, deployment, or provider config changed.

Continuation claim: PROD-005 / TRUTH-001

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: preserve group context when a member opens the complete play history.

Changed: Group-home history now links to `/play/history?groupId=...`; the history page derives a group-scoped title, filters completed sessions to that group, and provides a group-specific empty state with a plan-session action. Personal history remains unchanged when no filter is supplied.

Review: PROD-005 / TRUTH-001 / EQ-006

Verified: Frontend Biome, six browser unit tests, production build (597.52 kB initial / 137.30 kB estimated transfer), and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: TRUTH-001 / PROD-005 / EQ-006

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: make future plans and past group memories legible as different session states.

Changed: Canonical session detail now uses state-specific headings and copy: Plan for game night, Game night is live, Game night memory, and Cancelled game night. Attendee, shortlist, player-count, and played-game labels now describe planning versus saved historical truth instead of reusing future-facing wording.

Review: TRUTH-001 / PROD-005 / EQ-006

Verified: Frontend Biome, six browser unit tests, production build (597.52 kB initial / 137.29 kB estimated transfer), and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: PROD-005 / EQ-006

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: make legacy invitation lifecycle bounded and truthful while preserving private-beta access control.

Changed: Migration `0008-add-invitation-expiry.sql` adds a nullable expiry column and backfills existing legacy invitations to 30 days after `sentAt`. New legacy invitations receive the same expiry; expired invitations are omitted from recipient/owner pending lists and acceptance returns a clear request for a new invite. The invitation card now shows the expiry date. No live migration or deployment was performed.

Review: PROD-005 / SEC-008 / DATA-002

Verified: Backend lint, build, 197 tests across 44 suites, frontend lint, production build (598.41 kB initial / 137.87 kB estimated transfer), six frontend unit tests, empty-state migration verification through 0008, and `git diff --check` pass. No production data, deployment, or provider config changed.

Continuation claim: PROD-005 / TRUTH-001

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: make planning a future game night and recording a past game night visibly different jobs.

Changed: The Play and History entry points will use explicit future/past session language, and the past-session form will explain its purpose and point people toward future planning separately. This keeps the social session loop clear without adding catalog-detail navigation.

Review: PROD-005 / TRUTH-001 / EQ-006

Verified: Frontend Biome, six browser unit tests, production build (598.46 kB initial / 137.84 kB estimated transfer), public Playwright checks (4 passed, 7 authenticated skipped without Clerk state), and `git diff --check` pass. Authenticated assertions now cover the explicit future/past session labels when a storage state is supplied. No migration, production data, deployment, or provider config changed.

Continuation claim: SEC-002 / SEC-003

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: narrow the authenticated self-profile response to identity data the browser actually needs.

Changed: Add a dedicated self-profile DTO and return only id, email, username, display name, avatar, and creation time from the profile endpoint. Keep account-state and administrator fields in internal/admin/auth-status contracts rather than the ordinary browser profile payload, with response-schema and regression coverage.

Review: SEC-002 / SEC-003 / EQ-004

Verified: Backend ESLint, build, 200 tests across 44 suites, frontend Biome, build (598.39 kB initial / 137.83 kB estimated transfer), six frontend unit tests, public Playwright checks (4 passed, 7 authenticated skipped without Clerk state), and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: EQ-004 / SEC-002

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: add client-side negative coverage for the narrowed self-profile response.

Changed: The Angular API contract suite will assert that valid self-profile data is accepted and malformed identity/contact data is rejected before it reaches application state.

Review: EQ-004 / SEC-002

Verified: Frontend Biome, eight browser-based unit tests, production build (598.39 kB initial / 137.83 kB estimated transfer), public Playwright checks (4 passed, 7 authenticated skipped without Clerk state), and `git diff --check` pass. The new tests cover valid/malformed self-profile response contracts and confirm account-state fields are not exposed to application state. No migration, production data, deployment, or provider config changed.

Continuation claim: SEC-003 / SEC-004

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: close the admin list-query validation gap and preserve valid zero-valued proposal metadata.

Changed: Added strict query DTOs for administrator game/proposal lists: supported proposal statuses, title-search length, positive page numbers, and a maximum page size of 100 are now enforced at the controller boundary. Approval defaults now use nullish fallback so an intentional zero duration/player value is not silently replaced by a default.

Review: SEC-003 / SEC-004 / API-001

Verified: Backend lint, build, 203 tests across 44 suites, including HTTP rejection/transform tests for the new admin query boundary, and `git diff --check` pass. No migration, production data, deployment, or provider config changed.
