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
| DATA-002 | TODO | Data model | Add numbered migrations and make the schema reproducible from empty state. | DATA-001 |
| DATA-003 | REVIEW | Data model | Choose and implement the canonical session schema, including attendance and planned/played games. | DATA-001 |
| DATA-004 | TODO | Data model | Add transaction boundaries for group, session, proposal, and collection mutations. | DATA-002, DATA-003 |

## P1 — flagship product loop

| ID | Status | Workstream | Task | Dependencies |
|---|---|---|---|---|
| PROD-001 | TODO | Product | Decide and document canonical brand, nouns, persona, and ownership policy. Session semantics are accepted in ADR-0003. | None |
| PROD-002 | REVIEW | Core loop | Implement a real first-five-games collection activation flow. | SEC-002, DATA-002 |
| PROD-003 | TODO | Core loop | Finish invitation acceptance, group roles, and member visibility. | SEC-002, DATA-003 |
| PROD-004 | TODO | Core loop | Implement deterministic recommendation scoring with explanations and unit tests. | PROD-001, DATA-003 |
| PROD-005 | REVIEW | Core loop | Implement atomic session creation and replace the wizard submission TODO. | DATA-003, DATA-004 |
| PROD-006 | REVIEW | Core loop | Implement upcoming, active, completed, and cancelled session views using real data. | PROD-005 |
| PROD-007 | REVIEW | Core loop | Implement actual play history and basic group statistics. | PROD-005, DATA-003 |
| PROD-008 | TODO | Core loop | Persist recommendation feedback and feed it into future scoring. | PROD-004, PROD-007 |

## P2 — quality and launch readiness

| ID | Status | Workstream | Task | Dependencies |
|---|---|---|---|---|
| EQ-001 | TODO | Quality | Add lockfiles, root commands, environment documentation, and reproducible local setup. | None |
| EQ-002 | TODO | Quality | Add CI gates for build, tests, lint, and migrations. | EQ-001 |
| EQ-003 | REVIEW | Quality | Replace starter tests with authorization and core journey coverage. | SEC-001, PROD-005 |
| EQ-004 | TODO | Quality | Establish generated/shared API contracts and response validation. | DATA-003 |
| EQ-005 | TODO | Quality | Add health checks, structured logging, error monitoring, and database operational checks. | EQ-001 |
| EQ-006 | TODO | Quality | Fix frontend bundle, styling warnings, accessibility, responsiveness, and timezone handling. | PROD-005 |
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
