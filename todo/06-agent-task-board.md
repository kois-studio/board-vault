# Agent task board

This is the shared coordination ledger. Claim a task before editing. Keep one owner per task and update the status when the implementation moves to review.

Status values: `TODO`, `BLOCKED`, `IN_PROGRESS`, `REVIEW`, `DONE`.

## P0 — safety and data truth

| ID | Status | Workstream | Task | Dependencies |
|---|---|---|---|---|
| SEC-001 | REVIEW | Security | Remove privileged fields from public user updates and add privilege-boundary tests. | None |
| SEC-002 | REVIEW | Security | Audit and enforce object-level authorization across user, group, invitation, notification, meeting, and collection APIs. | SEC-001 recommended |
| SEC-003 | REVIEW | Security | Derive admin reviewer identity from JWT and add admin authorization tests. | SEC-002 |
| SEC-004 | IN_PROGRESS | Security | Enable strict validation, rate limits, safe CORS, token expiry, generic reset responses, and safe logging. | None |
| DATA-001 | TODO | Data model | Reconcile repository SQL and services against the owner-confirmed deployed schema and produce a code/schema drift report. | None |
| DATA-002 | TODO | Data model | Add numbered migrations and make the schema reproducible from empty state. | DATA-001 |
| DATA-003 | TODO | Data model | Choose and implement the canonical session schema, including attendance and planned/played games. | DATA-001 |
| DATA-004 | TODO | Data model | Add transaction boundaries for group, session, proposal, and collection mutations. | DATA-002, DATA-003 |

## P1 — flagship product loop

| ID | Status | Workstream | Task | Dependencies |
|---|---|---|---|---|
| PROD-001 | TODO | Product | Decide and document canonical brand, nouns, persona, ownership policy, and session semantics. | None |
| PROD-002 | TODO | Core loop | Implement a real first-five-games collection activation flow. | SEC-002, DATA-002 |
| PROD-003 | TODO | Core loop | Finish invitation acceptance, group roles, and member visibility. | SEC-002, DATA-003 |
| PROD-004 | TODO | Core loop | Implement deterministic recommendation scoring with explanations and unit tests. | PROD-001, DATA-003 |
| PROD-005 | TODO | Core loop | Implement atomic session creation and replace the wizard submission TODO. | DATA-003, DATA-004 |
| PROD-006 | TODO | Core loop | Implement upcoming, active, completed, and cancelled session views using real data. | PROD-005 |
| PROD-007 | TODO | Core loop | Implement actual play history and basic group statistics. | PROD-005, DATA-003 |
| PROD-008 | TODO | Core loop | Persist recommendation feedback and feed it into future scoring. | PROD-004, PROD-007 |

## P2 — quality and launch readiness

| ID | Status | Workstream | Task | Dependencies |
|---|---|---|---|---|
| EQ-001 | TODO | Quality | Add lockfiles, root commands, environment documentation, and reproducible local setup. | None |
| EQ-002 | TODO | Quality | Add CI gates for build, tests, lint, and migrations. | EQ-001 |
| EQ-003 | TODO | Quality | Replace starter tests with authorization and core journey coverage. | SEC-001, PROD-005 |
| EQ-004 | TODO | Quality | Establish generated/shared API contracts and response validation. | DATA-003 |
| EQ-005 | TODO | Quality | Add health checks, structured logging, error monitoring, and database operational checks. | EQ-001 |
| EQ-006 | TODO | Quality | Fix frontend bundle, styling warnings, accessibility, responsiveness, and timezone handling. | PROD-005 |
| TRUTH-001 | TODO | Launch | Remove unsupported landing claims, fake testimonials, dead links, and placeholder product states. | PROD-001, PROD-004, PROD-007 |
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
Known follow-ups: Review global legacy user exposure, then define the canonical session model and admin action audit logging.

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
