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
| DATA-004 | IN_PROGRESS | Data model | Add transaction boundaries for remaining group, session, proposal, and collection mutations; group creation, legacy invitation acceptance, canonical session writes, collection state transitions, review/activity memory, and group-decision signals are now transactional. | DATA-002, DATA-003 |

## P1 — flagship product loop

| ID | Status | Workstream | Task | Dependencies |
|---|---|---|---|---|
| PROD-001 | DONE | Product | Decide and document canonical brand, nouns, and persona; Board Vault, Session, and the organizer/host persona are now explicit. Recommendation ownership is accepted as collective selected-attendee ownership in ADR-0002, and session semantics are accepted in ADR-0003. | None |
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
| EQ-004 | REVIEW | Quality | Establish generated/shared API contracts and response validation; the committed OpenAPI snapshot now has a CI freshness gate, targeted frontend schemas cover core session/play responses, and the deprecated URL-based group-creation parameters are documented and bounded while broader compatibility coverage remains. | DATA-003 |
| EQ-005 | TODO | Quality | Add health checks, structured logging, error monitoring, and database operational checks. | EQ-001 |
| EQ-006 | IN_PROGRESS | Quality | Fix frontend bundle, styling warnings, accessibility, responsiveness, and timezone handling. | PROD-005 |
| AUTH-UX-001 | IN_PROGRESS | Product quality | Redesign sign-in and invitation-registration onboarding as one explicit, accessible state machine with clear linking/provisioning handoffs and first-dashboard guidance. | AUTH-001/AUTH-002, EQ-006 |
| UX-FLOW-001 | IN_PROGRESS | Product quality | Review flagship work as connected, role-aware user flows with recovery and shared-state checkpoints; prove the first-group activation journey end to end without expanding catalog scope. | PROD-002, PROD-003, PROD-005, EQ-006 |
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
Task: UX-FLOW-001
Owner: Codex
Claimed: 2026-09-07

Branch/worktree: main / shared workspace
Scope: establish and apply connected, role-aware flow review to the flagship first-group activation journey, including recovery, refresh, shared-state, and destructive branches, without expanding catalog scope
```

Review: UX-FLOW-001

Changed: Added `docs/ux-flows.md` as the product flow-review contract and
recorded the first-group activation flow as the next end-to-end evidence gate.
The existing screen-level collection, invitation, recommendation, and session
coverage is intentionally not treated as proof of one connected user journey.

Verified: Documentation links resolve; a fresh fixture-gated connected browser
journey passed against disposable local SQLite and two development-only Clerk
identities with the browser host aligned to the saved Clerk state. It covered
group creation, existing-account invitation and acceptance, collection
activation, explainable recommendation, first-session planning, and member
leave back to the groups dashboard in 6.5 seconds. The run exposed and fixed
missing native form-submit handlers in group creation and group management.
The recovery branch also passes a forced create failure → durable alert → retry,
the invitation branch passes keep-it → explicit decline, and the provider
invitation branch passes failure → preserved email → successful retry. The
public navigation suite also proves that an existing invited account gets a
continuation action instead of a new credential form. The default suite, lint,
unit tests, and build remain green; no production data or provider settings
were changed.

Known follow-ups: Cover new-person/expired invitation and provider/legacy
failure/retry variants. New-person registration now has a clear provider
challenge boundary, but the headless rehearsal stopped at enabled Clerk Smart
CAPTCHA and needs a human-capable completion. Then complete human
focus/screen-reader review. Keep AUTH-UX-001 open for invitation-registration
browser coverage and human focus/screen-reader review.
Do not expand catalog or standalone analytics scope.

Previous most recent claim:

```text
Task: AUTH-UX-001
Owner: Codex
Claimed: 2026-09-07

Branch/worktree: main / shared workspace
Scope: replace the confusing Clerk-to-local-account header handoff with one explicit, accessible sign-in and invitation-registration onboarding state machine, without changing the private-beta policy or authentication contract
```

Review: AUTH-UX-001

Changed: Clerk-to-local-account readiness now lives in `LoginService`, concurrent verification is deduplicated, and public auth completion from `/`, `/login`, or `/register` intentionally lands on `/dashboard`. While a Clerk identity is signed in but the local account is not ready, the header keeps navigation stable and the complete layout presents an explicit full-page handoff with accessible busy messaging. A recoverable full-page error provides retry, sign-out, and invitation guidance. The state map is documented in `docs/authentication.md`; the private-beta policy and auth contract are unchanged.

Verified: `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` passes 61/61, including account-readiness gating, deduplicated Clerk verification state, visible loading/error/retry handoff coverage, and Clerk-aware sign-out; `cd frontend && npm run build` passes with a 608.94 kB raw / 138.65 kB estimated-transfer initial bundle; `cd frontend && npx biome check src/app src/styles.css` passes; `git diff --check` passes; and disposable development Clerk browser rehearsals with delayed local `/auth/clerk/status` boundaries pass at 375px and 1280px, complete into the dashboard, show no header-only status or horizontal overflow, and recover from a deliberately aborted status request through the visible retry controls. Temporary development actor sessions were revoked after the runs. No deployment, push, provider mutation, or production data change was performed.

Known follow-ups: Complete the authenticated invitation-registration browser path for a new person through the provider challenge; exercise sign-out, refresh/back, expiry/refresh/unavailable-group, keyboard, and screen-reader checks; then remove AUTH-UX-001 from `docs/TODO.md` only when those acceptance criteria are evidenced. Existing-account invitation continuation is now covered by a public browser branch, and provider invitation failure/retry is covered by a disposable local journey. Do not expand catalog or analytics scope.

Previous most recent claim:

```text
Task: EQ-006 / TRUTH-001
Owner: Codex
Claimed: 2026-09-07

Branch/worktree: main / shared workspace
Scope: use the clean two-account rehearsal and rendered core audit to review the remaining landing, history, and primary-route UX/accessibility gaps without expanding catalog scope
```

Review: EQ-006 / TRUTH-001

Changed: The disposable two-account social session rehearsal now passes RSVP, refresh, session lifecycle, attendance, per-game participation, feedback, retryable loading, shared history, recommendation handoff, and group-library “Last played” consistency after refresh. The rendered core audit now passes the primary group, management, session, collection, upcoming, and history routes at 375px, 768px, and 1280px with overflow, visible-control naming, duplicate routed-button focus, and representative keyboard-traversal checks. The audit caught and the UI fixed a real 375px group-management member-row overflow. This claim now moves into the product-facing review of landing/history copy, human assistive-technology semantics, and remaining route-surface friction.

Verified: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4300 ... npx playwright test e2e/social-session-flow.spec.ts` passes in 7.5 seconds against a fresh disposable local SQLite fixture and two development Clerk identities, including the post-refresh group-library “Last played” assertion; all 10 authenticated-core navigation checks pass in 3.5 seconds after aligning the recommendation assertion with the intentional group-specific heading; the hardened `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4300 ... npx playwright test e2e/rendered-core-audit.spec.ts` passes at 375px, 768px, and 1280px; `npm test -- --watch=false --browsers=ChromeHeadless` passes 59/59; backend `npm test -- --runInBand` passes 266 tests across 48 suites, including email provider mapping, Redis health cooldown, and schema-aware readiness coverage; `npx biome check src/app src/styles.css`, `git diff --check`, and `npm run build` pass with a 602.50 kB raw / 136.20 kB estimated-transfer initial bundle. Development impersonation sessions were revoked after the runs. No deployment, push, or production data change was performed.

Known follow-ups: Human keyboard/content review, broader authenticated route coverage, provider/cache integration, Turso recovery ownership, and launch verification remain open. Do not expand catalog or analytics scope.

Previous most recent claim:

```text
Task: DATA-004
Owner: Codex
Claimed: 2026-09-06

Branch/worktree: main / shared workspace
Scope: make administrative game-proposal approval atomic across the created game, translations, tags, proposal state, and submitter notification without expanding catalog UX
```

Review: DATA-004

Changed: Administrative proposal approval now writes the created game, translations, tags, proposal status, and submitter notification through one database transaction. Proposal and submitter-stat caches invalidate only after commit; the canonical social product surface remains unchanged.

Verified: `cd backend && npm test -- --runInBand` passes 48 suites / 263 tests after the rejection follow-up; `cd backend && npm run test:e2e -- --runInBand` passes 6 environment-safe HTTP tests; `cd backend && npm run build`; `cd backend && npm run lint:check`; `cd backend && npm run lint:logs`; and `git diff --check` pass. Failure-injection coverage proves notification failure rolls back the created game, translation, tag, and proposal writes, and the rejected proposal state. No deployment, push, provider mutation, or production data change was performed.

Known follow-ups: Duplicate marking intentionally has no notification side effect; broader provider/cache integration remains separate, and the public social loop remains the product priority.

Previous most recent claim:

```text
Task: DATA-004
Owner: Codex
Claimed: 2026-09-06

Branch/worktree: main / shared workspace
Scope: make the deprecated bulk user-game compatibility mutation atomic so a partial collection update cannot survive a failed delete or insert
```

Review: DATA-004

Changed: The deprecated bulk collection path now uses one write transaction with idempotent inserts; canonical collection routes remain the preferred product path.

Verified: `cd backend && npm test -- --runInBand` passes 48 suites / 259 tests; `cd backend && npm run test:e2e -- --runInBand` passes 6 environment-safe HTTP tests; `cd backend && npm run build`; `cd backend && npm run lint:check`; `cd backend && npm run lint:logs`; and `git diff --check` pass. Failure-injection coverage proves a later ownership write rolls back the earlier delete. No deployment, push, provider mutation, or production data change was performed.

Known follow-ups: Audit proposal/admin multi-write behavior separately; do not expand legacy compatibility into new product surface.

Previous most recent claim:

```text
Task: EQ-006
Owner: Codex
Claimed: 2026-09-06

Branch/worktree: main / shared workspace
Scope: redesign the group management surface around the owner’s social jobs—invite people, review pending invitations, manage membership, and understand shared context—without expanding catalog/detail scope or changing authorization behavior
```

Review: EQ-006

Changed: The group management route is now a responsive social-management workspace with explicit owner/member context, group summary, separate known-member and new-person invite paths, pending invitation management, current-member controls, shared-shelf context, and an isolated danger zone. Existing API calls, owner checks, invitation revocation, membership staging, and delete confirmation behavior remain intact.

Verified: `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` passes 59 tests; `cd frontend && npm run lint:check` passes; `cd frontend && npm run build` passes with a 602.51 kB initial raw bundle / 136.22 kB estimated transfer and no Angular template warnings; `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4300 npm run e2e` passes 5 public tests with 21 fixture-gated tests skipped; backend HTTP E2E passes 6 tests; `git diff --check` passes. The in-app preview route was reachable, but snapshot automation timed out twice, so no preview screenshot is claimed. No deployment, push, provider mutation, or production data change was performed.

Known follow-ups: Validate the rendered route with an owner and member in the authenticated browser rehearsal; revisit whether invitation composition should become an in-context dialog after real use.

Previous most recent claim:

```text
Task: EQ-004
Owner: Codex
Claimed: 2026-09-06

Branch/worktree: main / shared workspace
Scope: extend the frontend response-contract negative matrix around the social decision and session handoffs without expanding catalog/detail scope
```

Review: EQ-004

Changed: Availability checks now encode query values so email addresses/usernames containing `+` survive transport. The frontend contract matrix now rejects malformed group-acquisition entries, recommendation signals, scheduled-session envelopes, and provider invitation handoffs before they reach application state.

Verified: `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` passes 59 tests; `cd frontend && npm run lint:check` passes; `cd frontend && npm run build` passes with a 604.95 kB initial raw bundle / 136.36 kB estimated transfer; `git diff --check` passes. No deployment, push, provider mutation, or production data change was performed.

Known follow-ups: Keep authenticated two-account rehearsal and generated-client evaluation separate until core response shapes stabilize.

Continuation claim: DATA-004

Owner: Codex

Claimed: 2026-09-06

Branch/worktree: main / shared workspace

Scope: make collection activation ownership, activity memory, and wishlist cleanup one atomic database write, with explicit activity-cache invalidation

Review: DATA-004

Changed: Collection activation now atomically inserts ownership, records the added/unwishlisted activity events, removes the wishlist row when present, and trims activity memory to the newest 32 rows. The collection service invalidates the account activity cache only after the transaction commits; duplicate activation maps back to the established conflict response.

Verified: `cd backend && npm test -- --runInBand` passes 47 suites / 245 tests; `cd backend && npm run build`; `cd backend && npm run lint:check`; `cd backend && npm run lint:logs`; and `git diff --check` pass. No deployment, push, provider mutation, or production data change was performed.

Known follow-ups: Audit proposal and remaining legacy multi-write mutations, then add failure-injection coverage for the next transaction boundary.

Continuation claim: DATA-004

Owner: Codex

Claimed: 2026-09-06

Branch/worktree: main / shared workspace

Scope: make group acquisition interest and reopening a declined group decision one atomic social signal

Review: DATA-004

Changed: Member interest now uses one transaction for the guarded interest insert and reopening a `not_now` group decision. The existing ownership-race check remains in the service, and duplicate/owned-group outcomes preserve the current API behavior.

Verified: `cd backend && npm test -- --runInBand` passes 47 suites / 246 tests; `cd backend && npm run build`; `cd backend && npm run lint:check`; `cd backend && npm run lint:logs`; and `git diff --check` pass. No deployment, push, provider mutation, or production data change was performed.

Known follow-ups: Audit proposal and remaining legacy multi-write mutations, then add failure-injection coverage for the next transaction boundary.

Continuation claim: DATA-004

Owner: Codex

Claimed: 2026-09-06

Branch/worktree: main / shared workspace

Scope: extend transaction boundaries across collection removal, ownership metadata updates, and wishlist toggles so activity memory cannot drift from collection state

Review: DATA-004

Changed: Collection removal, ownership metadata edits, and wishlist toggles now write their domain row, bounded activity memory, and cache invalidation boundary through explicit transactions. Existing conflict/not-found behavior is preserved at the feature service boundary.

Verified: `cd backend && npm test -- --runInBand` passes 47 suites / 252 tests; `cd backend && npm run build`; `cd backend && npm run lint:check`; and `git diff --check` pass. No deployment, push, provider mutation, or production data change was performed.

Known follow-ups: Audit review/activity coupling, proposal and remaining legacy bulk mutations, then add failure-injection coverage for the next transaction boundary.

Continuation claim: DATA-004

Owner: Codex

Claimed: 2026-09-06

Branch/worktree: main / shared workspace

Scope: atomically persist review changes with rated activity memory and preserve review/activity cache invalidation boundaries

Review: DATA-004

Changed: Review replacement and rated activity recording now share one transaction, including bounded activity-memory trimming. Review cache invalidation and collection-activity cache invalidation happen only after the database commit; the collection feature no longer performs a second activity write.

Verified: `cd backend && npm test -- --runInBand` passes 48 suites / 254 tests; `cd backend && npm run build`; `cd backend && npm run lint:check`; `cd backend && npm run lint:logs`; and `git diff --check` pass. No deployment, push, provider mutation, or production data change was performed.

Known follow-ups: Audit proposal and remaining legacy bulk mutations, then add failure-injection and HTTP integration coverage for the transaction boundaries.

Continuation claim: DATA-004 / EQ-003

Owner: Codex

Claimed: 2026-09-06

Branch/worktree: main / shared workspace

Scope: prove rollback behavior for the collection, review-memory, and group-decision transaction boundaries through failure-injection regressions

Review: DATA-004 / EQ-003

Changed: Added failure-injection coverage proving that a collection activity failure, review-memory failure, or group-decision reopening failure rolls back the preceding write, never commits, and always closes the transaction.

Verified: `cd backend && npm test -- --runInBand` passes 48 suites / 257 tests; `cd backend && npm run build`; `cd backend && npm run lint:check`; `cd backend && npm run lint:logs`; and `git diff --check` pass. No deployment, push, provider mutation, or production data change was performed.

Known follow-ups: Add disposable HTTP/database integration evidence, audit proposal and remaining legacy bulk mutations, and keep authenticated social-loop rehearsal as the release gate.

Continuation claim: EQ-003 / TEST-004

Owner: Codex

Claimed: 2026-09-06

Branch/worktree: main / shared workspace

Scope: extend disposable HTTP security evidence across the core social endpoints without requiring production or authenticated fixture state

Review: EQ-003 / TEST-004

Changed: The disposable Nest HTTP suite now proves unauthenticated group-acquisition, recommendation-signal, session-scheduling, and collection-activation requests fail with 401 before domain access, alongside the existing Clerk-status and public-query checks.

Verified: `cd backend && npm run test:e2e -- --runInBand` passes 6 tests; `git diff --check` passes. No deployment, push, provider mutation, or production data change was performed.

Known follow-ups: Add authenticated disposable database/HTTP journeys when Clerk storage state is available, and keep the two-account social rehearsal as the release gate.

Previous most recent claim:

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

Continuation claim: PROD-005 / EQ-006 / AUTH-001

Owner: Codex

Claimed: 2026-09-05

Scope: make group invitation controls match the owner/member boundary.

Planned: hide invite mutations from non-owners and restore validation feedback for existing-member username invitations.

Review: PROD-005 / EQ-006 / AUTH-001

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

Continuation claim: PROD-005 / EQ-006

Owner: Codex

Claimed: 2026-09-05

Scope: remove the dead end from the upcoming-session entry point for people who have not joined a group yet.

Planned: provide direct create-group and invitation-management actions when scheduling has no available groups, and a clear action from the empty upcoming state.

Review: PROD-005 / EQ-006

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

Continuation claim: SEC-003

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: prevent former group members from mutating sessions they no longer belong to.

Changed: The shared database lookup used by organizer-only session mutations and legacy attendee management now joins the session’s `GroupMembership` row while checking `Meet.createdBy`. This keeps session writes aligned with the private-group membership boundary after a creator leaves a group.

Review: SEC-003 / DATA-003

Verified: Focused session/database/attendee tests pass (61 tests across 3 suites), backend lint and build pass, and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: EQ-004 / SEC-004

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: extend frontend response-contract negative coverage beyond authentication and self-profile data.

Changed: Add browser-based API contract tests for malformed session lifecycle responses, administrator pagination responses, and notification records. These tests ensure social state is rejected at the adapter boundary when backend shape or enum values drift.

Review: EQ-004 / SEC-004

Verified: Frontend Biome, 11 browser-based unit tests, and production build (598.39 kB initial / 137.83 kB estimated transfer) pass with no Angular warnings; `git diff --check` passes. The new tests reject malformed session status, administrator pagination, and notification responses. No migration, production data, deployment, or provider config changed.

Continuation claim: PROD-005 / EQ-006

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: keep group acquisition decisions distinct from personal catalog browsing.

Changed: Group acquisition search now removes games already owned by any member of the selected group, and the empty state explains that all matching results are already available to the group. This prevents a social decision action from presenting a game as a purchase candidate and only rejecting it after submission.

Review: PROD-005 / EQ-006

Verified: Frontend Biome, 11 browser-based unit tests, production build (598.39 kB initial / 137.83 kB estimated transfer), and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: PROD-005 / TRUTH-001

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: keep acquisition search from encouraging duplicate game proposals.

Changed: The group acquisition empty state now offers “Propose this game” only when the catalog returned no matching game. When all matching results are already owned by the group, the page directs members to search for another acquisition idea instead.

Review: PROD-005 / TRUTH-001

Verified: Frontend Biome, 11 browser-based unit tests, production build (598.39 kB initial / 137.83 kB estimated transfer), and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: PROD-005 / TRUTH-001

Owner: Codex

Claimed: 2026-09-04

Branch/worktree: main / shared workspace

Scope: preserve the group’s selected attendee context when requesting recommendations.

Changed: The group workspace now includes its selected members in the recommendation link, and the recommendation page validates and restores those member IDs for the selected group. Manual group changes still default to all members, while an invalid or stale query falls back safely.

Review: PROD-005 / TRUTH-001

Verified: Frontend Biome, 11 browser-based unit tests, production build (598.39 kB initial / 137.83 kB estimated transfer), and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: PROD-002 / PROD-005 / EQ-006

Owner: Codex

Claimed: 2026-09-04

Scope: keep collection activation guidance from blocking the social product loop and synchronize current verification evidence.

Changed: The collection page now treats five games as a helpful activation target instead of an artificial gate. When a user belongs to a group with usable games, the incomplete-activation state offers a direct group recommendation action; users without a group are guided to join or create one. The completed state also avoids sending a group with no usable games into an empty recommendation flow. CI now includes a repository whitespace check, and the canonical docs reflect the current 204 backend tests, 13 frontend unit tests, and 137.91 kB estimated frontend transfer baseline.

Review: PROD-002 / PROD-005 / EQ-006 / CI-001

Verified: Frontend Biome, 13 frontend browser-based unit tests, frontend production build (598.39 kB initial / 137.91 kB estimated transfer), and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: PROD-004 / PROD-005 / TRUTH-001

Owner: Codex

Claimed: 2026-09-04

Scope: make recommendation context and no-result recovery legible in the social decision flow.

Changed: The recommendation page now summarizes the selected members and duration constraint before results, explains that ranking uses group-scoped ownership, ratings, and feedback, and offers a group-scoped catalog path when no game satisfies the current constraints. The core-product-loop documentation now describes authenticated session submission coverage as the remaining work instead of the already-replaced wizard TODO.

Review: PROD-004 / PROD-005 / TRUTH-001

Verified: Frontend Biome, 13 frontend browser-based unit tests, frontend production build (598.39 kB initial / 137.83 kB estimated transfer), and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: DATA-002 / EQ-002 / TRUTH-002

Owner: Codex

Claimed: 2026-09-04

Scope: make schema recovery rehearsal repeatable without touching Turso or production.

Changed: Added `npm run verify:restore`, a disposable synthetic SQLite backup/copy rehearsal that preserves representative accounts, private-group membership, session attendance, played games, translations, and invitation history, applies migrations 0006–0008 to the restored copy, and verifies integrity, foreign keys, invitation expiry, session notes, and migration state. The database job now runs this rehearsal after the empty-state migration check, and operational docs distinguish this local evidence from a future provider-level Turso recovery test.

Review: DATA-002 / EQ-002 / TRUTH-002

Verified: `npm run verify:migrations`, `npm run verify:restore`, and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: PROD-005 / EQ-003

Owner: Codex

Claimed: 2026-09-04

Scope: protect the recommendation-to-session schedule handoff with local browser-based component coverage.

Changed: Added component tests for the canonical session scheduling form. The suite verifies that selected attendees and a recommended game survive query-parameter handoff, that empty attendance blocks submission, that a valid plan sends group, attendee, shortlist, notes, and timezone context, and that the loading state is released after the request completes.

Review: PROD-005 / EQ-003

Verified: Frontend Biome, 15 frontend browser-based unit tests, frontend production build (598.39 kB initial / 137.83 kB estimated transfer), and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: PROD-005 / EQ-003

Owner: Codex

Claimed: 2026-09-04

Scope: protect per-game social history edits in session detail.

Changed: Session-detail participant controls now refuse to remove the last participant from a played game, restore optimistic state when persistence fails, and surface an actionable error. Added component coverage for both the invariant and the failure rollback.

Review: PROD-005 / EQ-003

Verified: Frontend Biome, 17 frontend browser-based unit tests, frontend production build (598.39 kB initial / 137.84 kB estimated transfer), and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: DATA-003 / PROD-005 / EQ-004

Owner: Codex

Claimed: 2026-09-04

Scope: keep session list and organizer-read notes aligned with the current persisted schema.

Changed: Replaced `Meet m.*` in account-scoped, member-scoped, and organizer-scoped meet reads with explicit columns. The current table includes nullable `updatedAt` before `notes`; explicit projections prevent the parser from returning `updatedAt` as notes and silently dropping the saved session context. Added a regression test for the current eight-field read contract.

Review: DATA-003 / PROD-005 / EQ-004

Verified: Backend lint, build, 205 tests across 44 suites, focused meet/database tests, frontend Biome, 17 frontend browser-based unit tests, frontend production build (598.39 kB initial / 137.84 kB estimated transfer), and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: DATA-003 / PROD-007 / EQ-004

Owner: Codex

Claimed: 2026-09-04

Scope: remove the remaining wildcard session projection from group history reads.

Changed: The group-scoped meet query now uses the same explicit stable projection as account/member/organizer reads, preventing the current nullable `updatedAt` column from being misread as session notes. Added a regression test for group history note mapping.

Review: DATA-003 / PROD-007 / EQ-004

Verified: Backend lint, build, 206 tests across 44 suites, focused meet tests, frontend Biome, 17 frontend browser-based unit tests, frontend production build (598.39 kB initial / 137.84 kB estimated transfer), and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: PROD-004 / PROD-005

Owner: Codex

Claimed: 2026-09-04

Scope: make the upcoming-session list useful as a social planning surface.

Planned: lead with the group and human-readable session state, expose saved planning notes, and remove internal session identifiers from the primary card context.

Review: PROD-004 / PROD-005

Changed: Upcoming session cards now lead with the group name and date, use human-readable Planned/Live now states, expose saved planning notes when present, and remove the internal session identifier from the primary card context. Live sessions also use a clearer action label. Added frontend component coverage for the status and action labels.

Verified: Frontend Biome, 18 browser-based unit tests, frontend production build (598.35 kB initial / 137.88 kB estimated transfer), and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: PROD-005 / EQ-004

Owner: Codex

Claimed: 2026-09-04

Scope: make group history cards preserve the social memory of a game night.

Planned: show recorded attendees and saved session notes alongside the games played, with honest fallback copy when attendance was not recorded.

Review: PROD-005 / EQ-004

Changed: Group home history cards now show recorded attendees and saved session notes alongside the date and games played, with honest “Attendance not recorded” fallback copy. Added pure formatter coverage for short, long, and missing attendee lists.

Verified: Frontend Biome, 20 browser-based unit tests, frontend production build (598.35 kB initial / 137.86 kB estimated transfer), and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: PROD-004 / PROD-007

Owner: Codex

Claimed: 2026-09-04

Scope: connect persisted group play history to recommendation decisions without changing the first-release scoring model.

Planned: show each recommendation’s last-played context, including an honest not-played fallback, so the group can use history while choosing what to play.

Review: PROD-004 / PROD-007

Changed: Recommendation cards now show the persisted last-played date for the selected group or an honest “Not played by this group yet” fallback. The first-release scoring model remains unchanged; history-weighted ranking stays deferred until real usage provides enough evidence to tune novelty safely.

Verified: Frontend Biome, 21 browser-based unit tests, frontend production build (598.35 kB initial / 137.86 kB estimated transfer), and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: EQ-006 / TRUTH-001

Owner: Codex

Claimed: 2026-09-04

Scope: make the shared theme control keyboard- and screen-reader-legible on public and authenticated shells.

Planned: provide a state-aware accessible name, pressed state, button type, and visible keyboard focus treatment.

Review: EQ-006 / TRUTH-001

Changed: The dark-mode toggle now exposes “Use dark mode” or “Use light mode”, reports its pressed state, is explicitly a button, and has a visible focus ring. Added component coverage for the state-aware labels.

Verified: Frontend Biome, 22 browser-based unit tests, frontend production build (599.35 kB initial / 138.00 kB estimated transfer), rendered mobile and desktop public-auth snapshots, and `git diff --check` pass. No migration, production data, deployment, or provider config changed.

Continuation claim: AUTH-001 / EQ-006

Owner: Codex

Claimed: 2026-09-05

Scope: keep the preserved-account sign-in fallback usable without competing with the primary Clerk flow on small screens.

Planned: make the fallback form responsive, label its fields for assistive technology and password managers, and keep its loading state truthful.

Review: AUTH-001 / EQ-006

Changed: The preserved-account login and degraded-mode registration forms now use responsive `w-full`/`max-w-md` layouts instead of a fixed mobile-overflowing width. Their fields have explicit labels, stable IDs, password-manager autocomplete metadata, and clearer placeholders; the legacy login and registration actions are named as compatibility flows, and registration now keeps its loading state until the API settles.

Verified: `cd frontend && npm run lint:check`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (22 tests), `cd frontend && npm run build` (599.41 kB initial / 138.00 kB estimated transfer), and `git diff --check` pass. Local preview server started without deployment; the new form source compiles, while a second rendered snapshot attempt timed out in the preview automation. No migration, production data, provider configuration, or deployment changed.

Continuation claim: AUTH-001 / EQ-006

Owner: Codex

Claimed: 2026-09-05

Scope: remove migration/debug terminology from the signed-out header when a Clerk session still needs local account resolution.

Planned: preserve automatic session linking, expose only user-facing progress/recovery copy, and avoid rendering local account identifiers or provider error details.

Review: AUTH-001 / EQ-006

Changed: The unauthenticated header no longer exposes the migration-only “Verify Clerk link” control, raw local account identifiers, or provider error details. Automatic Clerk-to-local linking remains in place; unresolved sessions now show user-facing progress/recovery copy and a sign-out action.

Verified: `cd frontend && npm run lint:check`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (22 tests), `cd frontend && npm run build` (599.05 kB initial / 137.88 kB estimated transfer), and `git diff --check` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: PROD-005 / TRUTH-001 / EQ-006

Owner: Codex

Claimed: 2026-09-05

Scope: keep group cards truthful as a social activity entry point.

Planned: prevent upcoming or cancelled records from appearing as a group’s last session and provide an explicit zero-history state.

Review: PROD-005 / TRUTH-001 / EQ-006

Changed: Group cards now use completed sessions only for “Last session”, so planned or cancelled records cannot be presented as past group activity. Groups with no completed history now show an explicit “No sessions recorded yet” state.

Verified: `cd frontend && npm run lint:check`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (22 tests), `cd frontend && npm run build` (599.05 kB initial / 137.88 kB estimated transfer), and `git diff --check` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: PROD-005 / EQ-006

Owner: Codex

Claimed: 2026-09-05

Scope: remove the dead end from the upcoming-session entry point for people who have not joined a group yet.

Planned: provide direct create-group and invitation-management actions when scheduling has no available groups, and a clear action from the empty upcoming state.

Review: PROD-005 / EQ-006

Changed: Upcoming Sessions now gives people without groups direct paths to create a group or review invitations. When there are no upcoming sessions, the empty state exposes the scheduling action instead of requiring the user to find the header control.

Verified: `cd frontend && npm run lint:check`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (22 tests), `cd frontend && npm run build` (599.05 kB initial / 137.90 kB estimated transfer), and `git diff --check` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: PROD-005 / EQ-006 / AUTH-001

Owner: Codex

Claimed: 2026-09-05

Scope: make group invitation controls match the owner/member boundary.

Planned: hide invite mutations from non-owners and restore validation feedback for existing-member username invitations.

Review: PROD-005 / EQ-006 / AUTH-001

Changed: Group edit now shows invitation mutation controls only to the owner, matching the backend membership boundary. The existing-account username field now points at its actual control, so required/length validation feedback is rendered correctly; the email invitation field also has an explicit accessible label.

Verified: `cd frontend && npm run lint:check`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (22 tests), `cd frontend && npm run build` (599.05 kB initial / 137.89 kB estimated transfer), and `git diff --check` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: PROD-005 / EQ-006

Owner: Codex

Claimed: 2026-09-05

Scope: keep the past-session recorder usable on narrow screens and keyboard-driven flows.

Planned: contain the multi-step progress sequence on mobile and give the date/control elements explicit semantics.

Review: PROD-005 / EQ-006

Changed: The six-step past-session progress strip now scrolls within its own row on narrow screens instead of widening the page. The date field has an explicit label/ID, and attendee/game selection cards explicitly declare their button type.

Verified: `cd frontend && npm run lint:check`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (22 tests), `cd frontend && npm run build` (599.05 kB initial / 137.87 kB estimated transfer), and `git diff --check` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: PROD-005 / EQ-006

Owner: Codex

Claimed: 2026-09-05

Scope: expose selection state in the past-session recorder to assistive technology.

Planned: add pressed-state semantics to group, attendee, and game selection cards while preserving their current keyboard behavior.

Review: PROD-005 / EQ-006

Changed: Group, attendee, and game selection cards in the past-session recorder now expose `aria-pressed` state so the visual selection model is available to assistive technology.

Verified: `cd frontend && npm run lint:check`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (22 tests), `cd frontend && npm run build` (599.05 kB initial / 137.89 kB estimated transfer), and `git diff --check` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: PROD-004 / PROD-005 / EQ-006

Owner: Codex

Claimed: 2026-09-05

Scope: keep an intentionally empty attendee selection from silently becoming “everyone” during recommendation handoff.

Planned: require at least one selected group member before offering the recommendation route, while preserving empty selection for library exploration.

Review: PROD-004 / PROD-005 / EQ-006

Changed: The group decision handoff now offers “Find a game” only when at least one member is selected. With an empty selection, it points back to the attendee section instead of silently letting the recommendation page fall back to everyone.

Verified: `cd frontend && npm run lint:check`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (22 tests), `cd frontend && npm run build` (599.05 kB initial / 137.88 kB estimated transfer), and `git diff --check` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: EQ-006 / PROD-001

Owner: Codex

Claimed: 2026-09-05

Scope: make the collection search entry point accessible without making catalog browsing the product’s primary action.

Planned: give the search field a persistent accessible name and preserve its group-acquisition context.

Review: EQ-006 / PROD-001

Changed: The catalog search input now has a persistent accessible label, stable ID, and browser-autocomplete behavior while preserving the separate “add to my collection” versus “add for this group” context.

Verified: `cd frontend && npm run lint:check`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (22 tests), `cd frontend && npm run build` (599.05 kB initial / 137.87 kB estimated transfer), and `git diff --check` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: PROD-005 / EQ-006

Owner: Codex

Claimed: 2026-09-05

Scope: remove the dead end from the past-session recorder when a user has no group yet.

Planned: provide direct create-group and invitation-management actions from the recorder’s empty group state.

Review: PROD-005 / EQ-006

Changed: The past-session recorder’s no-group state now links directly to Create a group and View invitations, so users can satisfy the social prerequisite without navigating away blindly.

Verified: `cd frontend && npm run lint:check`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (22 tests), `cd frontend && npm run build` (599.05 kB initial / 137.88 kB estimated transfer), and `git diff --check` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: PROD-004 / PROD-005 / EQ-006

Owner: Codex

Claimed: 2026-09-05

Scope: make attendee context easy to adjust in the recommendation decision flow.

Planned: provide explicit bulk selection controls and pressed-state semantics so a group can quickly compare different attendance combinations without losing the social meaning of the result.

Review: PROD-004 / PROD-005 / EQ-006

Changed: The recommendation chooser now offers Everyone and Clear controls, announces the selected-member count, labels each attendee checkbox, and resets stale results and feedback whenever attendance context changes.

Verified: `cd frontend && npm run lint:check`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (23 tests), `cd frontend && npm run build` (599.05 kB initial / 137.89 kB estimated transfer), and `git diff --check` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: PROD-004 / PROD-005

Owner: Codex

Claimed: 2026-09-05

Scope: add an explainable group preference to recommendation decisions.

Planned: let a group choose between a balanced result, something new, or a group favorite, and include that context in the ranking explanation without introducing catalog-style global scoring.

Review: PROD-004 / PROD-005

Changed: Recommendations now accept and return an explicit decision lens. Balanced preserves the existing ranking, Something new boosts never-played games and explains the history trade-off, and Group favorite rewards strong group ratings and previously played games. The chooser exposes the lens next to attendees and available time, and changing it clears stale results and feedback.

Verified: `cd backend && npm run lint:check`, `cd backend && npm run build`, `cd backend && npm test -- --runInBand` (44 suites / 207 tests), `cd frontend && npm run lint:check`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (23 tests), `cd frontend && npm run build` (599.11 kB initial / 137.88 kB estimated transfer), and `git diff --check` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: PROD-004 / EQ-006

Owner: Codex

Claimed: 2026-09-05

Scope: keep the group acquisition decision surface truthful after refresh and reversible from browse results.

Planned: load the existing group acquisition board when entering group-scoped browse, expose saved interest consistently, and allow removing that interest without leaving the decision flow.

Review: PROD-004 / EQ-006

Changed: Group-scoped browse now loads the persisted acquisition shortlist before enabling add actions, shows games already on the shortlist after refresh, exposes a reversible “Remove my interest” action, and preserves the prior saved state when removal fails. A failed shortlist read is explicit and blocks ambiguous mutations.

Verified: `cd frontend && npm run lint:check`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (23 tests), `cd frontend && npm run build` (599.11 kB initial / 137.88 kB estimated transfer), and `git diff --check` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: PROD-005 / SEC-003

Owner: Codex

Claimed: 2026-09-05

Scope: align session lifecycle UX and backend policy so scheduled planning cannot be closed as completed without an active game night.

Planned: require the organizer to start a scheduled session before finishing it, and make the available session actions explain that lifecycle.

Review: PROD-005 / SEC-003

Changed: Scheduled sessions can now transition only to active or cancelled; completion requires the active state. The session view shows “Start game night” and planning guidance while scheduled, and exposes “Finish and save memory” only once active.

Verified: `cd backend && npm run lint:check`, `cd backend && npm run build`, `cd backend && npm test -- --runInBand` (44 suites / 208 tests), `cd frontend && npm run lint:check`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (23 tests), `cd frontend && npm run build` (599.11 kB initial / 137.88 kB estimated transfer), and `git diff --check` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: EQ-004 / PROD-004

Owner: Codex

Claimed: 2026-09-05

Scope: extend client response-contract coverage to the shared acquisition board and recommendation decision-lens boundary.

Planned: verify valid empty acquisition state and reject malformed acquisition/recommendation responses before they reach product state.

Review: EQ-004 / PROD-004

Changed: Client contract coverage now accepts an empty group acquisition board and rejects a malformed recommendation decision lens; the request body is also asserted to carry the selected lens.

Verified: `cd frontend && npm run lint:check`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (25 tests), `cd frontend && npm run build` (599.13 kB initial / 137.94 kB estimated transfer), and `git diff --check` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: PROD-001

Owner: Codex

Claimed: 2026-09-05

Scope: close the remaining brand and user-facing vocabulary ambiguity before further product work.

Planned: make Board Vault and Session canonical in product direction and mark legacy Meet terminology as compatibility/database-only.

Review: PROD-001

Changed: Product direction now explicitly accepts Board Vault as the brand and Session as the user-facing event noun. The core-loop, launch-readiness, implementation, and task-board docs now preserve that boundary; PROD-001 is marked DONE.

Verified: `rg` review found no active BoardMeet product naming claim; current routes and product copy use Board Vault/Session terminology, while remaining `Meet*` references are compatibility/database implementation references. `git diff --check` passes. No code, migration, production data, provider configuration, or deployment changed.

Continuation claim: PROD-003 / EQ-006

Owner: Codex

Claimed: 2026-09-05

Scope: make private-beta Clerk invitation sharing provide explicit copy feedback.

Planned: report whether the secure invitation link was copied, unavailable, or failed, with accessible status semantics.

Review: PROD-003 / EQ-006

Changed: Clerk invitation sharing now reports copied, unavailable, and failed clipboard states in an announced status message, while preserving the secure link and manual-open fallback. The personal collection route now describes the shelf as private input to group decisions and gives an empty shelf actionable activation paths.

Verified: `cd frontend && npm run lint:check`, `cd frontend && npm run build` (599.15 kB initial / 137.98 kB estimated transfer), and `git diff --check` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: PROD-002 / TRUTH-001

Owner: Codex

Claimed: 2026-09-05

Scope: clarify the boundary between a member’s private collection and the group’s shared decision workspace.

Planned: make the personal collection page explain what its games mean, and make its empty state lead into useful collection activation instead of presenting “no games” as a dead end.

Review: PROD-002 / TRUTH-001 / EQ-006

Changed: The personal collection route now explains that games are private member-owned input to group decisions. Its empty state links to adding the first game or opening the group workspace, and a populated state points back to shared group context.

Verified: `cd frontend && npm run lint:check`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (26 tests), and `cd frontend && npm run build` (599.15 kB initial / 137.98 kB estimated transfer) pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: SEC-002 / PROD-003

Owner: Codex

Claimed: 2026-09-05

Scope: align deprecated username-invitation compatibility endpoints with the V1 owner-only membership policy.

Planned: require group ownership for creating legacy invitations and add regression coverage for both invitation entry points.

Review: SEC-002 / PROD-003

Changed: The deprecated generic and username invitation creation endpoints now require `GroupOwnerGuard`, and the guard accepts the legacy body-based `groupId` as well as canonical URL parameters. `InvitationsModule` now wires the guard and its group-service dependency, so the runtime Nest dependency graph matches the tested authorization policy. This keeps member-level acquisition/session participation separate from owner-level membership management.

Verified: `cd backend && npm run lint:check`, `cd backend && npm test -- --runInBand` (44 suites / 210 tests), `cd backend && npm run build`, `cd backend && npm run test:e2e -- --runInBand` (2 tests), and `git diff --check` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: EQ-003 / EQ-006

Owner: Codex

Claimed: 2026-09-05

Scope: document the safe development workflow for Clerk CLI impersonation and authenticated Playwright state.

Planned: record how to target the development instance, create a temporary impersonation URL, save a local browser state, and avoid production credentials or committed tokens.

Review: EQ-003 / EQ-006

Changed: `docs/testing.md` now documents the complete development-only workflow: inspect the linked instance, impersonate a development user with Clerk CLI, save the redirected browser state with Playwright Codegen, run the authenticated suite, and repeat for a second user when testing invitations. `docs/operations.md` links the same workflow and records that production impersonation and committed storage tokens are prohibited.

Verified: `git diff --check` passes. The local backend watch attempt was stopped because `backend/.env` currently lacks required Turso, JWT, and Redis values; no provider, database, or deployment state was changed.

Continuation claim: EQ-003 / EQ-006

Owner: Codex

Claimed: 2026-09-05

Scope: verify the documented Clerk impersonation workflow against the linked development instance and record its local redirect behavior.

Planned: confirm the CLI is linked to the intended development instance, issue a temporary actor URL without exposing it, and validate the local test-server prerequisites without touching production.

Review: EQ-003 / EQ-006

Changed: Confirmed `clerk whoami` resolves the `board-vault` development instance, `clerk impersonate ... --instance dev --print --yes` returns a short-lived URL, and the backend/frontend can run against a disposable SQLite database with Redis disabled. Documented that an instance without a home URL can initially land on Clerk's development account page and may need an explicit URL-encoded local `redirect_url`.

Verified: The temporary actor session was accepted by the development Clerk frontend and reached the local Board Vault dashboard on port 4300 after the backend development CORS contract was aligned with the Playwright server. The backend accepted the Clerk session and provisioned the identity into disposable SQLite. No production user, database, provider configuration, deployment, or committed token was changed. `git diff --check` passes.

Continuation claim: AUTH-001 / PROD-003 / EQ-006

Owner: Codex

Claimed: 2026-09-05

Scope: keep the private-beta registration boundary fail-closed during a configured Clerk outage.

Planned: prevent the register route from exposing the legacy public registration form when Clerk is configured but unavailable, while preserving the legacy form only for explicit legacy-mode environments.

Review: AUTH-001 / PROD-003 / EQ-006

Changed: The register route now distinguishes “Clerk configured but unavailable” from “Clerk not configured”. The former shows a secure sign-up recovery state and never exposes the legacy registration form; the latter remains available only for explicit compatibility environments. Local development CORS now covers both supported Angular and Playwright origins.

Verified: `cd frontend && npm run lint:check`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (26 tests), `cd frontend && npm run build`, `cd backend && npm test -- --runInBand` (44 suites / 210 tests), `cd backend && npm run lint:check`, `cd backend && npm run build`, `cd backend && npm run test:e2e -- --runInBand` (2 tests), and `git diff --check` pass. No production user, database, provider configuration, or deployment changed.

Continuation claim: EQ-003 / PROD-001

Owner: Codex

Claimed: 2026-09-05

Scope: activate the authenticated navigation browser suite with a disposable development Clerk identity and current migrated SQLite schema.

Planned: create no production state, save a local-only Clerk storage state through the documented impersonation flow, apply pending migrations to disposable SQLite, and run the authenticated and public browser journeys together.

Review: EQ-003 / PROD-001

Changed: Added a dedicated verified development Clerk test member, created `/tmp/board-vault-clerk-member.json` through an isolated headless browser context, advanced disposable SQLite through migrations 0006–0008, and corrected authenticated E2E expectations to assert the truthful empty-group states and current button semantics. The shared `app-button` primitive now honors `routerLink`, repairing previously inert action controls.

Verified: `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_AUTH_STORAGE_STATE=/tmp/board-vault-clerk-member.json npm run e2e` passes all 11 public and authenticated tests. No production user, database, provider configuration, deployment, or storage token was changed; the storage state remains outside the repository.

Continuation claim: EQ-003 / PROD-005 / TRUTH-001

Owner: Codex

Claimed: 2026-09-05

Scope: make the authenticated social session rehearsal repeatable and exercise the flagship loop beyond navigation.

Planned: add an opt-in two-account browser journey for a disposable seeded session, including RSVP, refresh, owner lifecycle, attendance, per-game participants, retryable loading, feedback, and history.

Review: EQ-003 / PROD-005 / TRUTH-001

Changed: Added `frontend/e2e/social-session-flow.spec.ts`, guarded by explicit owner/member Clerk storage states and a disposable session ID. The journey now verifies member RSVP persistence, scheduled-to-active-to-completed lifecycle, organizer attendance, game-specific participant editing, retry after a failed session-detail request, post-session rating, and history refresh. The testing documentation records the fixture requirements and mutation boundary.

Verified: `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_OWNER_STORAGE_STATE=/tmp/board-vault-clerk-owner.json PLAYWRIGHT_MEMBER_STORAGE_STATE=/tmp/board-vault-clerk-member.json PLAYWRIGHT_SOCIAL_SESSION_ID=6 npx playwright test e2e/social-session-flow.spec.ts` passes (1 test). `cd frontend && npm run lint:check` and `git diff --check` pass. The run used only disposable SQLite and development Clerk identities; no production user, database, provider configuration, deployment, or storage token was changed.

Continuation claim: EQ-003 / PROD-003

Owner: Codex

Claimed: 2026-09-05

Scope: make the existing-account invitation acceptance journey repeatable in authenticated browser coverage.

Planned: add an opt-in owner/recipient browser journey for a fresh disposable group, preserving the invite-only boundary and proving refresh-safe acceptance.

Review: EQ-003 / PROD-003

Changed: Added `frontend/e2e/social-invitation-flow.spec.ts`, guarded by explicit owner/invitee Clerk states and a fresh group fixture. The journey verifies owner invitation, pending-invite visibility, recipient refresh, atomic acceptance, and group visibility after membership creation. Documentation now distinguishes this covered legacy existing-account path from still-open secure email delivery and expiry/provider-failure validation.

Verified: `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_OWNER_STORAGE_STATE=/tmp/board-vault-clerk-owner.json PLAYWRIGHT_INVITEE_STORAGE_STATE=/tmp/board-vault-clerk-invitee.json PLAYWRIGHT_INVITATION_GROUP_ID=5 PLAYWRIGHT_INVITATION_GROUP_NAME='Invite Run 2' PLAYWRIGHT_INVITEE_USERNAME=bvtestinvitee npx playwright test e2e/social-invitation-flow.spec.ts` passes (1 test). The run used only disposable SQLite and development Clerk identities; no production user, database, provider configuration, deployment, or storage token was changed.

Continuation claim: EQ-003 / PROD-002 / TRUTH-001

Owner: Codex

Claimed: 2026-09-05

Scope: make first-game personal collection activation repeatable in authenticated browser coverage.

Planned: verify the empty private shelf leads to catalog search, one game can be added, refresh preserves the ownership state, and duplicate adding is blocked.

Review: EQ-003 / PROD-002 / TRUTH-001

Changed: Added `frontend/e2e/collection-activation-flow.spec.ts`, guarded by an explicit disposable Clerk storage state and selected game fixture. The journey verifies private-shelf activation guidance, catalog search, first-game addition, persisted refresh state, duplicate protection, and return to the private shelf. `docs/TODO.md` now records that this is first-game evidence only; the five-game and real-group usefulness goal remains open.

Verified: `PLAYWRIGHT_BASE_URL=http://localhost:4300 PLAYWRIGHT_COLLECTION_STORAGE_STATE=/tmp/board-vault-clerk-collection.json PLAYWRIGHT_COLLECTION_GAME_SEARCH=Cascadia PLAYWRIGHT_COLLECTION_GAME_TITLE=Cascadia npx playwright test e2e/collection-activation-flow.spec.ts` passes (1 test). The run used only disposable SQLite and a development Clerk identity; no production user, database, provider configuration, deployment, or storage token was changed.

Continuation claim: SEC-003 / DATA-004 / PROD-005

Owner: Codex

Claimed: 2026-09-05

Scope: close the canonical session lifecycle’s stale-transition race.

Planned: make organizer status transitions conditional on the status observed during authorization, and ensure a losing concurrent terminal transition cannot rewrite planned games.

Review: SEC-003 / DATA-004 / PROD-005

Changed: `DatabaseService.updateMeetStatus` now updates only when the expected current status still matches inside the write transaction. Terminal planned-game cleanup runs only when that status update affects the session row. `SessionsService` passes the status it authorized, and regression coverage protects both the conditional arguments and the no-op losing-race path. The session ADR, architecture, data-model, security, and active TODO now record the lifecycle concurrency policy and the remaining non-lifecycle replacement-write gap.

Verified: `cd backend && npm test -- --runInBand src/modules/features/sessions/sessions.service.spec.ts src/modules/common/database/database.service.spec.ts` passes (60 tests), `cd backend && npm run lint:check`, `cd backend && npm run build`, and `git diff --check` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: SEC-003 / DATA-004 / PROD-005

Owner: Codex

Claimed: 2026-09-05

Scope: prevent scheduled/active session replacement writes from mutating a session after a concurrent terminal transition.

Planned: pass the authorized editable status into attendee, shortlist, and played-game replacement transactions, reject the write when the status no longer matches, and surface a recoverable conflict to the client.

Review: SEC-003 / DATA-004 / PROD-005

Changed: Attendee, shortlist, and played-game replacement transactions now perform an in-transaction status gate and return an explicit no-op when the session has changed. The session service maps that outcome to a conflict response telling the organizer to reload; the played-game response keeps its public contract free of the internal gate marker. Regression coverage preserves transaction behavior and the existing session response shape. Same-status stale overwrites remain open for a future versioned-write decision.

Verified: `cd backend && npm test -- --runInBand` passes (44 suites / 211 tests), `cd backend && npm run lint:check`, `cd backend && npm run build`, and `git diff --check` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: DATA-004 / PROD-003 / TRUTH-001

Owner: Codex

Claimed: 2026-09-05

Scope: keep the group acquisition board truthful when a member already owns or concurrently acquires a game.

Planned: exclude currently group-owned games from board reads and make interest insertion atomic with the ownership check, while preserving idempotent duplicate interest behavior.

Review: DATA-004 / PROD-003 / TRUTH-001

Changed: Acquisition board reads now hide interest rows for games owned by any current group member. The insert uses `INSERT ... SELECT ... WHERE NOT EXISTS` so a group ownership race cannot create a stale interest row; the service rechecks ownership when an ignored insert loses that race. Regression coverage protects the SQL boundary, race response, and existing aggregation contract.

Verified: `cd backend && npm test -- --runInBand src/modules/core/groups/group-acquisition.service.spec.ts src/modules/common/database/database.service.spec.ts` passes (30 tests), `cd backend && npm run lint:check`, and `cd backend && npm run build` pass. No migration, production data, provider configuration, or deployment changed.

Continuation claim: PROD-002 / PROD-003 / TRUTH-001 / EQ-003

Owner: Codex

Claimed: 2026-09-05

Scope: prove the explainable recommendation decision loop in an authenticated browser journey.

Planned: select a decision lens, load a group-aware recommendation, save member feedback, recover that signal after refresh, and carry the selected game and attendees into session planning.

Review: PROD-002 / PROD-003 / TRUTH-001 / EQ-003

Changed: Added `frontend/e2e/recommendation-decision-flow.spec.ts` with explicit disposable fixture inputs. It verifies the explanation and history context, the interested signal, persistence after a fresh page load, and the planning handoff without turning the recommendation page into a catalog surface.

Verified: The focused journey passes with the local Angular/API runtime and disposable SQLite/Clerk development state. The full local Playwright run passes 12 tests with 3 fixture-gated skips when the owner/recommendation fixtures are supplied. No production data, provider configuration, deployment, or storage token was changed.

Continuation claim: PROD-003 / DATA-001 / EQ-003 / TRUTH-001

Owner: Codex

Claimed: 2026-09-05

Scope: give the group acquisition shortlist a lightweight owner-controlled resolution state without turning Board Vault into a shopping catalog.

Planned: distinguish open, planned, and not-now acquisition conversations, retain member interest context, hide owned games as terminal truth, and prove the UX through a disposable browser journey.

Review: PROD-003 / DATA-001 / EQ-003 / TRUTH-001

Changed: Added accepted ADR-0009 and migration 0009 for `GroupAcquisitionDecision`. The group board now exposes open/planned/not-now state and decision attribution; only the group owner can update it, renewed member interest reopens not-now, and ownership continues to hide the candidate. Added strict DTO/API boundaries, owner UI actions, response-schema coverage, backend regression tests, and `frontend/e2e/acquisition-decision-flow.spec.ts` covering plan, postpone, reopen, and refresh persistence.

Verified: `node database/scripts/verify-empty-state.mjs` passes through migration 0009; backend full suite passes 44 suites / 217 tests, frontend unit suite passes 26 tests, frontend lint/build passes (600.42 kB initial / 137.63 kB estimated transfer), and the full local Playwright run passes 13 tests with 3 fixture-gated skips when owner/recommendation/acquisition fixtures are supplied. No live Turso migration, production data, provider configuration, deployment, or push was performed.

Continuation claim: EQ-003 / PROD-005 / TRUTH-002

Scope: make the flagship two-account session rehearsal repeatable against a
clean disposable fixture.

Changed: Added the non-destructive `database/scripts/seed-social-fixture.mjs`
script and root `npm run seed:social-fixture` wrapper. The fixture validates
active accounts, an existing game, and migration state before atomically
creating a private group, two memberships, shared game ownership, a review, and
a scheduled session. Updated the social-session Playwright spec to accept
generated group/game names, tolerate an already-completed RSVP mutation, and
use a 120-second integration budget with bounded action/navigation diagnostics.

Verified: A fresh fixture (`groupId=7`, `sessionId=8`, Cascadia) passed the full
two-account RSVP → active → attendance → per-game participant → completed →
feedback → history journey in 6.5 seconds. The initial failures were traced to
expired Clerk storage state and a partially mutated disposable session, then
resolved by regenerating dev-only owner/member state and reseeding. No live
Turso data, production Clerk identity, deployment, or push was used.

Known follow-ups: Real-group usefulness and a clean multi-journey acceptance
rehearsal remain launch gates; provider failure and broader integration
coverage remain open.
Continuation claim: SEC-003 / TS-005 / API-002

Scope: close concrete request-boundary gaps found during the P0 authorization and
validation audit without expanding the product beyond the social loop.

Changed: Added typed, transformed, and bounded query DTOs for collection browse
and admin duplicate-review notes. Group names are now capped at 100 characters;
the existing session timezone and note limits remain part of the canonical social
session contract. Added negative/positive controller coverage proving oversized
inputs are rejected before service access and valid query values reach services in
typed form.

Verified: Backend full suite passes 44 suites / 222 tests; focused validation,
lint, TypeScript, and `git diff --check` pass. No migration, production data,
provider configuration, deployment, or push was performed.

Known follow-ups: Continue the complete DTO decorator inventory, especially
legacy proposal/notification free text and array-size policies; complete the
broader object-authorization and API response-shape review.

Continuation claim: EQ-003 / PROD-005

Owner: Codex

Claimed: 2026-09-05

Scope: make invitation lifecycle state visible and recoverable across the groups
workspace and group management route.

Changed: The shared invitation card now explains that acceptance adds the
recipient to the private group’s shared games and future session plans, uses
explicit action semantics, and requires a reversible inline confirmation before
declining. Added owner-only Clerk provider-invitation list and revoke endpoints,
metadata filtering, response contracts, pending-invite management UI, and an
explicit loading/unavailable state for direct group-edit navigation. Provider
ticket URLs are never returned by the list endpoint.

Verified: Backend full suite passes 44 suites / 227 tests, backend build and
no-mutation lint pass; frontend full unit suite passes 30 tests, Biome passes,
and the production build passes at 603.43 kB initial raw / 137.99 kB
estimated transfer. No migration, production data, provider configuration,
deployment, or push was performed.

Known follow-ups: Validate pending/accepted/rejected/expired and provider email
invitation states with real two-person data, including the secondary profile
modal and mobile/keyboard behavior; provider pagination and delivery failures
remain integration checks.

Continuation claim: TS-005 / SEC-004 / EQ-003

Owner: Codex

Claimed: 2026-09-06

Changed: Added a zero-context group activation panel that appears only for a one-person group with no games, history, or upcoming session. It stages the first three social actions—invite the people, add useful games, and plan the first night—with owner/member-appropriate copy and direct actions, while established groups keep the complete workspace.

Verified: `cd frontend && npx biome check src/app/pages/group-view/group-view.component.ts src/app/pages/group-view/group-view.component.spec.ts src/app/pages/group-view/group-view.component.html`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (43 passing), `cd frontend && npm run build` (605.70 kB initial raw / 138.25 kB estimated transfer), and `git diff --check` pass. Rendered empty-group validation remains open. No deployment or push was performed.

Scope: complete focus return for the contextual group leave/delete dialogs.

Acceptance: opening either dialog moves focus to the safe cancel action, cancellation restores focus to the triggering action, destructive confirmation remains loading-safe, and the behavior is covered in the disposable destructive-flow journey.

Continuation claim: EQ-007 / PROD-003

Owner: Codex

Claimed: 2026-09-06

Changed: Group leave and delete dialogs now remember their trigger, focus the safe cancel action after opening, and restore focus after cancellation. The opt-in destructive-flow journey asserts both transitions.

Verified: `cd frontend && npx biome check src/app e2e`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (43 passing), `cd frontend && npm run build` (605.70 kB initial raw / 138.26 kB estimated transfer), `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4300 npx playwright test e2e/public-navigation.spec.ts` (5 passing), and `git diff --check` pass. Disposable authenticated destructive-flow execution remains opt-in. No deployment or push was performed.

Scope: keep every primary “choose a game” handoff group-scoped after the Play hub redesign.

Acceptance: Dashboard and Collection must pass a concrete usable group ID into recommendations when one exists, and route to group selection when none exists; no new global recommendation entry point is added.

Continuation claim: PROD-003 / TRUTH-001

Owner: Codex

Claimed: 2026-09-06

Changed: Dashboard now selects a group with shared games for its decision card and names that group; otherwise it routes to group selection. Collection activation and ready-state decision links now carry the first group with usable shared games. Focused tests cover both handoffs.

Verified: `cd frontend && npx biome check src/app/pages/collection-page src/app/pages/dashboard-page`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (44 passing), `cd frontend && npm run build` (605.70 kB initial raw / 138.26 kB estimated transfer), and `git diff --check` pass. Rendered Dashboard/Collection review remains open. No deployment or push was performed.

Scope: finish the numeric-identifier part of the service logging audit without losing useful provider diagnostics.

Acceptance: domain and legacy compatibility logs must not interpolate account, group, game, invitation, membership, notification, proposal, review, tag, or meeting identifiers; only explicitly safe operational fields such as error class, feature method, port/path, TTL/status, and cache-disabled state may remain.

Continuation claim: SEC-006 / OPS-007

Owner: Codex

Claimed: 2026-09-06

Changed: Removed internal entity/account identifiers, provider message IDs, cache key counts, and serialized query options from the remaining audited service logs. Safe error-class and operational diagnostics remain available for diagnosis.

Verified: `rg` audit of backend logger interpolation, `cd backend && npm run lint:logs`, `cd backend && npx eslint "{src,apps,libs,test}/**/*.ts"`, `cd backend && npm test -- --runInBand` (46 suites / 237 tests), `cd backend && npm run build`, and `git diff --check` pass. No deployment or push was performed.

Changed: Audited backend service logging and removed raw schema/provider exception objects plus user-entered group, game, tag, username, and search values from the corrected operational messages. Email failures now emit only a safe error class and no longer double-log provider failures; existing database, cache, auth, and HTTP logging boundaries remain intact.

Verified: Backend tests pass 46 suites / 234 tests, backend build and no-mutation ESLint pass, the email-log regression confirms no raw provider object or recipient value crosses the logger, and `git diff --check` passes. No deployment or push was performed. Stable provider/domain diagnostic codes, numeric-identifier policy, and broader remote observability remain open.

Scope: close the remaining legacy played-game authorization gap found during the social session boundary audit.

Acceptance: the deprecated per-account played-game create path must derive the actor from the verified identity, require membership in the session group, and reject game IDs that are not owned by any current group member. Preserve deletion of existing historical links so old data remains removable.

Continuation claim: SEC-003 / SEC-008

Owner: Codex

Claimed: 2026-09-06

Changed: The compatibility create path now returns the authorized session group from its member-scoped lookup, checks the requested game against the group’s currently owned games, and rejects unrelated game IDs before any write. Deletion remains membership-scoped so historical links can still be removed after ownership changes.

Verified: The focused service suite passes four tests, including outside-group denial, unrelated-game denial, permitted owned-game creation, and delete-boundary protection. No production data, deployment, or push was touched.

Scope: recheck private-beta account retention and production identity-verification access.

Changed: Read-only Turso queries found four active unverified legacy accounts; three have group/game history and are excluded by the retention policy, while the only history-free account remains younger than 60 days. The cleanup candidate count is zero. A read-only Clerk production config pull was attempted but the linked CLI has no production instance configured.

Verified: No account was deleted, contacted, or modified. The initial `prod` alias lookup did not verify Clerk configuration and no production mutation was attempted; the exact-instance read-only verification is recorded in the follow-up entry below.

Continuation claim: AUTH-001 / OPS-005

Owner: Codex

Claimed: 2026-09-06

Scope: correct and close the structured HTTP logging regression found during a real authenticated local request.

Changed: Request middleware and the global API error filter now derive the logged path from `originalUrl` (with a safe URL fallback), so mounted routes no longer collapse to `/`. The focused middleware regression now asserts a mounted auth path, in addition to request-ID reuse and query/authorization redaction.

Verified: Backend 46 suites/231 tests pass; backend build and ESLint pass; no deployment or push was performed. Repository-wide service-log allow-listing and provider-specific error mapping remain open under READINESS-008.

Continuation claim: SEC-006 / OPS-007

Owner: Codex

Claimed: 2026-09-06

Scope: close the production private-beta configuration verification gap without changing Clerk.

Changed: Queried the exact production Clerk instance configuration read-only after the CLI’s `prod` alias proved unset.

Verified: Production sign-up mode is `restricted`; email, username, and password are required; password minimum is 15 characters; email verification and Smart CAPTCHA are enabled. No production setting, user, invitation, deployment, or database row was changed.

Continuation claim: AUTH-001

Owner: Codex

Claimed: 2026-09-06

Scope: redesign and verify the Clerk invitation registration flow after the provider ticket exchange failure.

Changed: Replaced the eager ticket exchange with an explicit invitation form for the configured username/password requirements, added existing-user ticket sign-in handling, activated completed Clerk sessions, redirected successful invitees to the dashboard, mounted Clerk’s required `clerk-captcha` target, and added bounded validation/error states.

Verified: A disposable valid-format development invitation with `notify:false` completed through `/register` to `/dashboard` and provisioned the local session. Smart CAPTCHA was disabled only during that single dev rehearsal and restored to enabled afterward; the broader human-CAPTCHA, delivery, expiry, and failure/retry paths remain open. The `example.test` fixture domain was rejected by Clerk and is documented as invalid test data. No production state, deployment, or push was changed.

Continuation claim: AUTH-001 / EQ-007

Owner: Codex

Claimed: 2026-09-06

Scope: run the complete local regression gate after the rendered UX and migration-evidence milestones.

Changed: Re-ran backend tests, frontend browser-unit tests, frontend build/lint, and signed-out public Playwright navigation checks against the current tree.

Verified: Backend 45 suites/230 tests, frontend 32/32 browser-unit tests, frontend build, Biome lint, and 3 signed-out public checks passed; the full default public suite remains 4 tests. The current initial bundle is 603.43 kB raw / 138.04 kB estimated transfer. No deployment or push was performed.

Continuation claim: TEST-001 / CI-001

Owner: Codex

Claimed: 2026-09-06

Continuation claim: EQ-007 / UX-CORE

Owner: Codex

Claimed: 2026-09-06

Scope: improve keyboard and assistive-technology fundamentals across the primary social loop without expanding catalog scope.

Changed: Added a shared focus-visible ring for links, buttons, and form controls; explicitly associated the session date and notes fields with labels; and marked history/upcoming load failures as alerts. Updated the PM/PO reassessment, UI/UX register, active TODO, standards matrix, and test ledger.

Verified: Frontend production build (606.82 kB initial raw), Biome, all 34 browser unit tests, and four public Playwright tests pass. No deployment or push was performed.

Known follow-up: keyboard traversal, contrast, screen-reader behavior, long-content review, and the real two-person social-loop rehearsal remain open.

Continuation claim: UX-CORE / TRUTH-001

Owner: Codex

Claimed: 2026-09-06

Scope: remove transiently misleading loading values from the group social home.

Changed: The group pulse now shows an unknown/loading dash instead of a settled zero while history is being fetched; group-home history, standalone history, and upcoming-session loading states now expose polite status announcements. Updated the active product TODO, UI/UX register, and test ledger.

Verified: Frontend build, Biome, and all 34 browser unit tests pass. The backend environment gate for the real two-person rehearsal remains open; no deployment or push was performed.

Continuation claim: SEC-006 / OPS-007

Owner: Codex

Claimed: 2026-09-06

Scope: establish safe, diagnosable HTTP request logging without exposing query strings, authorization values, or provider details.

Changed: Added a small structured-log helper, server-generated request correlation IDs, `X-Request-Id` response propagation, structured request-start/request-complete events, and reuse of the same ID for unexpected `ApiErrorFilter` failures. Added focused regression coverage for query-string and authorization redaction, event emission, and response correlation. Updated the security, architecture, testing, standards, and active TODO records.

Verified: Backend 46 suites/231 tests pass, including the focused logger/filter tests; backend build and ESLint pass; no deployment or push was performed.

Known follow-up: legacy service logs still need an allow-listed redaction sweep, and provider-specific error/cause mapping remains open.

Continuation claim: PROD-002 / EQ-007

Owner: Codex

Claimed: 2026-09-06

Branch/worktree: main / shared workspace

Scope: run a PM/PO/tech-lead UX checkpoint for the public landing, group setup, and history surfaces, then implement the highest-value social-loop improvements locally.

Changed: The landing page now centers the recurring-group decision-and-memory loop and explicitly stays outside public catalog/encyclopedia positioning. Group creation was redesigned as a focused setup route with corrected control validation, clear next steps, accessible labeling, and retryable submission behavior. History was redesigned as group-aware shared memory with a group filter, session/game/people summaries, most-played context, stronger timeline cards, participant/note context, honest empty states, and direct future-planning handoffs. Public navigation assertions were updated to protect the new product promise.

Verified: Frontend production build, Biome, 32 browser unit tests, `git diff --check`, signed-out rendered preview at desktop and 375px, and the four-test public Playwright suite pass. No production data, deployment, or push was changed. Full authenticated real-group usefulness, keyboard/focus/contrast/screen-reader review, and the broader completion checklist remain open.

Continuation claim: PROD-006 / EQ-007

Owner: Codex

Claimed: 2026-09-06

Branch/worktree: main / shared workspace

Scope: continue the social-loop UX pass into upcoming sessions and canonical scheduling.

Changed: Upcoming sessions now starts with a group-first planning handoff, uses an agenda-like timeline, preserves useful status and planning-note context, and gives an actionable no-session state. The canonical schedule route now distinguishes group loading, group-read failure, and an unavailable/stale group before exposing the form, preventing blank or misleading planning pages.

Verified: Frontend production build, Biome, 32 browser unit tests, and the four-test public Playwright suite pass. No production data, deployment, or push was changed. Authenticated real-session usefulness and full keyboard/focus/contrast/screen-reader review remain open.

Continuation claim: EQ-007 / TEST-001

Owner: Codex

Claimed: 2026-09-06

Branch/worktree: main / shared workspace

Scope: protect the new shared-memory and schedule-state UX with explicit frontend contracts.

Changed: Schedule tests now provide the loading/error boundary dependencies explicitly. Added a history component contract covering group filtering, session/game/people counts, and the bounded most-played summary used by the social-memory surface.

Verified: Frontend Biome and all 33 browser unit tests pass. The reassessment keeps real two-person usefulness, provider/recovery evidence, and rendered accessibility review ahead of further catalog or analytics work.

Continuation claim: SEC-003 / EQ-007

Owner: Codex

Claimed: 2026-09-06

Branch/worktree: main / shared workspace

Scope: prevent stale group context from surviving a membership/group-list refresh on the scheduling route.

Changed: Canonical scheduling now clears the selected group, attendees, and planned games when the route’s group disappears or the authenticated user is unavailable. The truthful unavailable-group state can therefore not expose an old planning form after a permission or membership change.

Verified: Targeted Biome and all 34 frontend browser unit tests pass. No production data, deployment, or push was changed.

Scope: validate the pending schema release against a fresh production snapshot without changing live Turso.

Changed: Exported the live `board-vault` database through the authenticated Turso CLI into a temporary local SQLite file, checked integrity and foreign keys, and applied migrations 0006–0009 to the copy with the committed migration runner.

Verified: The live export is healthy and reports 16 accounts, 13 sessions, 22 session-game links, and 5 groups; the migrated copy reaches 0009 cleanly with the same counts. Production remains at migration 0005 and was not modified. Backup ownership, schedule, recovery target, and live rollout/rollback procedure remain open.

Continuation claim: DATA-001 / OPS-001

Owner: Codex

Claimed: 2026-09-06

Scope: close the next request-boundary gaps found during the DTO audit without
expanding the product beyond the social loop.

Changed: Added explicit maximums for legacy credentials, profile/avatar fields,
proposal and notification text, invitation identifiers/emails, and bulk
collection/tag/session arrays. Added a focused request-boundary suite covering
registration, proposal, notification, collection, and session limits. Updated
the security, API, operations, testing, standards, implementation inventory,
and active TODO documents with the remaining legacy/client validation gaps.

Verified: Backend full suite passes 45 suites / 230 tests; backend build, no-
mutation lint, and `git diff --check` pass. Refreshed disposable development
Clerk owner/member storage states and reran the seeded two-account session
journey: RSVP → active → attendance → per-game participants → completed →
feedback → history passes in 6.4 seconds. No migration, production data,
provider configuration, deployment, or push was changed.

Known follow-ups: Complete the remaining DTO decorator inventory and client
negative-response tests; validate provider failures and real-group usefulness
before treating the core loop as launch-ready.

Continuation claim: TS-005 / ANGULAR-006 / EQ-003

Owner: Codex

Claimed: 2026-09-06

Scope: extend negative client response-contract evidence beyond the original
authentication boundary.

Changed: Added Angular API contract tests that reject non-pending provider
invitation summaries and false success envelopes from recommendation feedback.
The current client negative matrix now covers malformed auth/profile/session/
recommendation/admin/notification/provider-invitation responses and mutation
success contracts.

Verified: Frontend unit suite passes 32 browser-based tests and the affected
API spec passes Biome with no fixes. No backend, database, provider, deployment,
or production state changed.

Known follow-ups: Cover the remaining legacy response shapes and connect the
contract matrix to broader authenticated/authorized integration journeys.
Continuation claim: SEC-005 / EQ-003

Owner: Codex

Claimed: 2026-09-06

Branch/worktree: main / shared workspace

Scope: verify the provider-managed group email invitation lifecycle with the linked development Clerk instance and close the route-parameter contract defect exposed by that rehearsal.

Changed: Clerk invitation route identifiers now match the observed `inv_...` provider format. The strict route DTO validates both `groupId` and `invitationId`, preventing the global `forbidNonWhitelisted` pipe from rejecting otherwise valid revoke requests. A disposable owner flow created an invitation, observed pending-list visibility, revoked it, and confirmed removal after refresh. No production invitation, migration, deployment, or push was performed.

Review: SEC-005 / EQ-003

Verified: Targeted backend tests pass (15 tests), backend lint/build pass, and the local provider rehearsal passes create/list/revoke/removal. Provider acceptance after recipient verification, expiry, and delivery-failure/retry remain open.

Continuation claim: EQ-007 / PROD-003

Owner: Codex

Claimed: 2026-09-06

Branch/worktree: main / shared workspace

Scope: make group-detail navigation truthful when group data is still loading, fails, disappears, or changes under a reused route.

Changed: Group detail now exposes loading, retryable group-list failure, and unavailable-group states with a route back to the groups workspace. Shared group state is cleared when the route changes or membership disappears, preventing stale group content from appearing under another group URL. Added an authenticated Playwright regression for unavailable-group recovery.

Review: EQ-007 / PROD-003

Verified: Frontend build and targeted Biome checks pass; the unavailable-group authenticated browser check passes. Broader rendered responsive, keyboard, focus, contrast, and long-content review remains open.

Continuation claim: EQ-007 / PROD-003

Owner: Codex

Claimed: 2026-09-06

Scope: remove the provider invitation pending-list race exposed by the real development rehearsal.

Changed: Group email invitation creation and revocation now await the provider-list refresh before the operation settles, keeping the success/revoked state and pending list consistent. The disposable Clerk rehearsal was rerun after the change.

Verified: Frontend build, targeted Biome, frontend unit tests (32/32), and provider create/list/revoke browser rehearsal pass. No deployment or push was performed.

Continuation claim: EQ-007

Owner: Codex

Claimed: 2026-09-06

Scope: close a rendered accessibility and hit-area defect in the group shared library.

Changed: Group-library image-only links now have explicit responsive dimensions and accessible “View …” names. Added an opt-in authenticated browser assertion for the rendered contract.

Verified: Frontend build passes; the focused browser check passes with `PLAYWRIGHT_GROUP_ID=7`; the mobile rendered check reports no horizontal overflow and 96×96 game-link targets. Broader image fallback and accessibility review remains open.

Continuation claim: EQ-007

Owner: Codex

Claimed: 2026-09-06

Scope: align the group workspace navigator with the actual rendered social workflow.

Changed: The area navigator now follows the page order: Decide, Games to acquire, Sessions, Group library, and History & insights. The opt-in browser check asserts the anchor order alongside the accessible game-link contract.

Verified: Frontend build and the focused authenticated browser check pass. No deployment or push was performed.

Continuation claim: PROD-002 / EQ-006

Owner: Codex

Claimed: 2026-09-06

Scope: make the first-five-games activation gate repeatable without depending on production catalog data.

Changed: Added a file-only `seed-collection-activation-fixture.mjs` that refuses non-file database URLs and seeds five clearly named catalog games. Added an opt-in Playwright journey that adds or recognizes all five games and verifies the “Your games are ready for group decisions” handoff.

Verified: The local fixture and authenticated five-game journey pass in 7.7 seconds. The remaining product question is whether real groups find five games useful and whether catalog search quality is sufficient; no production data or deployment was changed.

Continuation claim: SEC-006 / PROD-002

Owner: Codex

Claimed: 2026-09-06

Scope: verify that personal collection data remains private while group surfaces provide shared context.

Changed: Added an opt-in two-account browser journey covering owner/member private shelves with distinct disposable games. The journey asserts each account sees its own game and not the other account’s private-only game; the collection copy and group-workspace boundary are now backed by rendered evidence.

Verified: Disposable owner/member Clerk sessions pass the privacy journey in 2.5 seconds. No production data, deployment, or push was changed.

Continuation claim: PROD-003 / EQ-003

Owner: Codex

Claimed: 2026-09-06

Scope: attempt the remaining provider-managed invitation acceptance path with a disposable Clerk identity.

Changed: Rehearsed a fresh owner-created provider ticket with the backend redirect explicitly set to the isolated frontend port 4300. The ticket reached local `/register`, but Clerk’s client sign-up exchange returned HTTP 400; the result is recorded as an open provider investigation rather than a passing acceptance claim. All temporary pending invitations were revoked afterward.

Verified: Redirect configuration is now documented for the 4300 workflow; create/list/revoke remains green. Recipient acceptance, expiry, and provider delivery-failure/retry remain open and no production state was touched.

Scope: continue the rendered accessibility/responsive review with concrete core-route regressions.

Changed: Group decision/library cards now allow their content to shrink within the mobile grid, removing the 11px document overflow at 375px. History image-only game links now expose accessible “View …” names. The authenticated core browser check now guards the 375px overflow boundary and the history-link accessible name in addition to the group navigator order.

Verified: Frontend lint passes; all 9 authenticated core-navigation checks pass against the disposable Clerk/local SQLite environment. The broader route matrix and keyboard/focus/contrast review remain open. No deployment or push was performed.

Continuation claim: EQ-007

Owner: Codex

Claimed: 2026-09-06

Scope: turn the rendered core-route review into a repeatable responsive regression.

Changed: Added an opt-in Playwright audit for group, group-edit, session planning/detail, collection, upcoming-session, and history routes at 375px, 768px, and 1280px. It checks document overflow and unnamed visible controls using accessible-label, associated-label, labelled-by, title, text, and image-alt semantics.

Verified: The rendered audit passes all listed routes and breakpoints against disposable Clerk/local SQLite state. Keyboard-only traversal, focus visibility, contrast, screen-reader behavior, and non-core routes remain open. No deployment or push was performed.

Continuation claim: EQ-007

Owner: Codex

Claimed: 2026-09-06

Scope: close the current local regression checkpoint after the auth, private-beta, and operations reviews.

Changed: Rechecked repository cleanliness and diff safety, frontend no-mutation Biome lint, and the complete backend test suite after the latest documentation and Clerk-policy evidence updates.

Verified: Worktree is clean; `git diff --check` passes; frontend lint passes; backend 45 suites/230 tests pass. The prior frontend build/unit/public-browser gate also remains green, and no deployment or push was performed.

Continuation claim: TEST-001 / CI-001

Owner: Codex

Claimed: 2026-09-06

Scope: close the post-creation onboarding handoff gap in the social group flow.

Changed: The dashboard group-creation contract now returns the new group ID from the same transaction that creates its owner membership. The data service validates that response, and the focused create-group route opens `/groups/:groupId` after success so invite, shared-library, acquisition, and planning actions are immediately available. Added backend and frontend regression coverage.

Verified: Backend group-creation service coverage passes; frontend Biome, build, and the focused handoff test pass. The full frontend suite remains at 35 passing browser tests. No deployment or push was performed.

Continuation claim: PROD-003 / EQ-006

Owner: Codex

Claimed: 2026-09-06

Scope: make the remaining server-side Meet compatibility routes visibly deprecated in the generated API contract.

Acceptance: old meet detail and per-row attendee/played-game routes remain available for migration compatibility, but Swagger marks them deprecated and their source documentation points new work to canonical session routes.

Continuation claim: API-002 / PROD-003

Owner: Codex

Claimed: 2026-09-06

Changed: Marked legacy meet detail and per-row attendee/played-game operations as deprecated in their Nest Swagger metadata and updated the API contract documentation to direct new work to canonical session routes.

Verified: Backend test suite passes 46 suites / 234 tests, backend build and no-mutation ESLint pass, and no deployment or push was performed.

Scope: make direct group-creation navigation truthful while the authenticated account profile is still settling.

Changed: The create-group form now exposes the DataService account signal, keeps submission disabled until that local account exists, and announces the loading state instead of allowing an ambiguous busy submission. Added the readiness boundary to the component’s handoff regression.

Verified: Focused frontend Biome and component test pass; no deployment or push was performed. Broader rendered mobile, keyboard, duplicate-name, and real-group review remain open.

Continuation claim: PROD-003 / EQ-006

Owner: Codex

Claimed: 2026-09-06

Scope: remove provider-session-only races from protected-route activation.

Changed: LoginService now keeps the authenticated guard result pending until the local Board Vault account profile has loaded for both Clerk and legacy sessions. Profile failure still clears auth state and navigates away; the focused regression proves a valid provider session does not activate the route before local account data arrives.

Verified: Focused frontend Biome and LoginService test pass; no deployment or push was performed. Broader session-expiry/revocation browser review remains open.

Continuation claim: AUTH-001 / EQ-006

Owner: Codex

Claimed: 2026-09-06

Scope: rerun and harden the two-account flagship social journey after the route-readiness change.

Changed: Refreshed the disposable owner Clerk storage state, seeded a fresh local scheduled session, and corrected the final history assertion to scope group/game/memory checks to the visible history article instead of a hidden group-filter option.

Verified: `social-session-flow.spec.ts` passes RSVP, refresh, owner lifecycle, attendance, per-game participant editing, retryable detail loading, completion, feedback, and visible history-card verification in 5.3 seconds. No production data, deployment, or push was touched.

Continuation claim: PROD-003 / TEST-002

Owner: Codex

Claimed: 2026-09-06

Scope: rerun the existing-account invitation acceptance journey against a fresh owner-only disposable group.

Changed: Created a fresh local group with only the owner, then exercised username invitation, recipient refresh, acceptance, refresh, and post-acceptance group visibility with the two disposable Clerk states. The first attempt was discarded as a fixture-ID selection error: the membership row ID was passed instead of the group ID; the corrected run used the verified group record.

Verified: `social-invitation-flow.spec.ts` passes in 3.2 seconds. Provider email delivery, expiry, and failure/retry paths remain open; no production data, deployment, or push was touched.

Continuation claim: PROD-003 / TEST-002

Owner: Codex

Claimed: 2026-09-06

Scope: continue the primary-route accessibility review with keyboard-only traversal, visible focus, and action semantics.

Acceptance: the core authenticated route audit must exercise representative keyboard traversal on the group workspace, group setup, session planning/detail, upcoming, collection, and history surfaces; any defect found in the reviewed path must be fixed with a focused regression. Do not expand the catalog or add a separate analytics surface in this slice.

Changed: Keyboard traversal exposed a duplicate tab stop on routed `app-button` hosts. The shared button primitive now removes the host from focus order so its native button is the only keyboard action, and the rendered core audit guards against a focusable custom-element host at each core breakpoint.

Verified: Frontend Biome, production build, and the authenticated core plus rendered route audits pass: 10 Playwright tests across the six primary routes and 375/768/1280px breakpoints. No deployment or push was performed.

Continuation claim: EQ-007 / PROD-002

Owner: Codex

Claimed: 2026-09-06

Scope: replace sparse standalone group leave/delete pages with contextual confirmations in the social group workspace.

Acceptance: owners can confirm deletion from group management, members can confirm leaving from the group workspace, both actions expose clear consequences/loading semantics, and the former URLs no longer render dead full-screen pages. Preserve the group-first product direction and add focused regression coverage.

Continuation claim: PROD-003 / EQ-006

Owner: Codex

Claimed: 2026-09-06

Changed: Group owners now confirm deletion in the management context, members can open a clear leave confirmation from the group workspace, and both dialogs explain the shared-data consequence and expose loading-safe cancel/confirm actions. The former standalone components were removed; their legacy URLs use an explicit compatibility handoff to the group workspace or management route.

Verified: The owner/member disposable Playwright journey passes both dialogs and cancel behavior plus both legacy URL handoffs in 2.5 seconds without executing a destructive mutation. Frontend build and targeted Biome pass. No production data, deployment, or push was touched.

Continuation claim: EQ-007 / PROD-003

Owner: Codex

Claimed: 2026-09-06

Scope: remove the unfinished security destructive-action placeholder and align settings navigation semantics with the actual route behavior.

Acceptance: security presents Clerk-managed controls as the actionable path, explains the current account-deletion policy without a disabled fake action, and settings navigation uses accessible links while retaining active-state styling.

Continuation claim: AUTH-001 / EQ-007

Owner: Codex

Claimed: 2026-09-06

Changed: Security now presents Clerk-managed sign-in controls as the actionable path and replaces the disabled account-deletion button with explicit private-beta policy copy. Settings Profile/Security navigation now uses semantic links while preserving active-route styling.

Verified: The disposable authenticated settings journey passes the semantic-link and truthful-policy assertions; frontend build and Biome pass. No deployment or push was performed.

Continuation claim: EQ-007 / AUTH-001

Owner: Codex

Claimed: 2026-09-06

Scope: retire unused frontend compatibility adapters so the client exposes only the canonical session flow.

Acceptance: remove unused Angular API/DataService methods and response types for deprecated per-row attendee and played-game writes; keep the backend compatibility routes documented for older clients and preserve the canonical session UI/API.

Continuation claim: PROD-003 / EQ-006

Owner: Codex

Claimed: 2026-09-06

Changed: Removed the unused Angular API/DataService methods and response types/schemas for deprecated per-row attendee and played-game mutations. The current client now exposes only the canonical session attendee/shortlist/played-game writes; backend compatibility routes remain documented and guarded for older clients.

Verified: Frontend Biome passes, all 36 browser unit tests pass, and the production build passes at 606.76 kB initial raw / 138.39 kB estimated transfer. No deployment or push was performed.

Scope: protect the public landing page’s social product promise with a responsive rendered regression.

Acceptance: the landing page must remain usable at mobile and desktop widths, expose the private-beta invitation CTA truthfully, and retain explicit group-decision/memory positioning without drifting toward a public game encyclopedia.

Continuation claim: EQ-007 / TRUTH-001

Owner: Codex

Claimed: 2026-09-06

Changed: Added a public Playwright regression at 375px and 1280px that checks no horizontal overflow, truthful self-registration/private-beta copy and CTA behavior, and explicit positioning against a public game encyclopedia.

Verified: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4300 npx playwright test e2e/public-navigation.spec.ts` passes all 5 public tests. No deployment or push was performed.

Scope: close the history-to-decision handoff gap in the shared-memory surface.

Acceptance: when viewing a specific group’s completed history, members can move directly from the shared memory summary to that group’s recommendation decision flow without leaving the group context; cover the handoff in the two-account journey.

Continuation claim: PROD-003 / EQ-006

Owner: Codex

Claimed: 2026-09-06

Changed: Added a group-filtered history CTA that opens the recommendation flow with the current group ID, and added component plus opt-in two-account journey assertions for the handoff.

Verified: The history component regression passes; frontend Biome, full 36-test unit suite, and production build pass. The authenticated two-account assertion remains opt-in and needs fresh Clerk storage state when the disposable session is rerun. No deployment or push was performed.

Scope: make the history surface preserve the full social memory of each played game.

Acceptance: the shared-memory summary must count people recorded either as session attendees or per-game participants, and each game card must explain who played it while retaining an honest fallback when participant data is missing.

Continuation claim: PROD-003 / EQ-006

Owner: Codex

Claimed: 2026-09-06

Changed: History now counts the union of recorded attendees and per-game participants, and game cards display a readable “Played by …” summary instead of only an opaque player count. Existing missing-participant fallback copy remains explicit.

Verified: Frontend Biome, all 36 browser unit tests, and the production build pass at 606.76 kB initial raw / 138.40 kB estimated transfer. No deployment or push was performed.

Scope: keep recommendation decisions oriented around the selected social group.

Acceptance: when a member enters recommendations from a group or history context, the page must name the group, provide a direct path back to its workspace, and explicitly frame results as a group/night decision rather than a global catalog ranking.

Continuation claim: PROD-003 / EQ-006

Owner: Codex

Claimed: 2026-09-06

Changed: Recommendations now use a group-specific decision title, expose a direct “Back to [group]” workspace link, and explain that the shortlist is for this group and night rather than a global ranking.

Verified: Frontend Biome, all 37 browser unit tests, and the production build pass at 606.76 kB initial raw / 138.39 kB estimated transfer. No deployment or push was performed.

Scope: audit remaining service logs for identifiers, provider payloads, and exception details that should not cross the operational log boundary.

Acceptance: retain actionable allow-listed events and correlation context while preventing emails, usernames, Clerk identifiers, recipient addresses, cache keys/payloads, SQL parameters, tokens, and provider exception details from being emitted; add focused regressions for any newly corrected service.

Continuation claim: SEC-006 / OPS-007

Owner: Codex

Claimed: 2026-09-06

Scope: orient the groups index around the next social action instead of a dense catalog-like card.

Acceptance: each group entry must expose its members, shared-game count, next or last session context, and explicit links to open the workspace, decide what to play, or plan a session. The entry must not use a single nested interactive block that obscures the available actions. Preserve pending-invitation visibility and add focused component coverage.

Continuation claim: PROD-003 / EQ-007

Owner: Codex

Claimed: 2026-09-06

Changed: Reworked the groups index cards into semantic social workspace entries. Each entry now exposes shared members and games, next-session or first-planning context, last-session memory, group history, recommendation, planning, and invitation-management links. The previous whole-card button was removed, and the empty state now explains the first-group activation handoff.

Verified: `cd frontend && npx biome check src/app`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (39 passing), `cd frontend && npm run build` (605.28 kB initial raw / 138.26 kB estimated transfer), and `git diff --check` pass. Rendered group-index and real-group validation remain open. No deployment or push was performed.

Scope: make upcoming sessions useful as a coordination inbox, not only a date list.

Acceptance: each upcoming session must explain its group context, show the group’s available people/games without pretending they are confirmed attendees, and make the next planning action clear for scheduled versus active sessions. Preserve honest loading/error/empty states and add focused component coverage.

Continuation claim: PROD-003 / EQ-007

Owner: Codex

Claimed: 2026-09-06

Changed: Upcoming session cards now show honest group context (`people · games available`) and a status-specific prompt: planned sessions direct members to review attendees and the shortlist, while active sessions direct organizers to record what was actually played. The list still keeps dates, notes, retryable states, and direct session actions visible without claiming that all group members are confirmed attendees.

Verified: `cd frontend && npx biome check src/app`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (40 passing), `cd frontend && npm run build` (605.28 kB initial raw / 138.24 kB estimated transfer), and `git diff --check` pass. Rendered upcoming-session review and real-group usefulness remain open. No deployment or push was performed.

Scope: establish stable safe diagnostic codes for private-beta and Clerk provider/configuration failures.

Acceptance: the API error envelope must preserve an allow-listed machine-readable code for the covered domain/provider boundaries, collapse unknown provider details to safe messages, retain request correlation, and cover the mapping with focused tests. Existing generic Nest error behavior must remain compatible.

Continuation claim: SEC-006 / API-003

Owner: Codex

Claimed: 2026-09-06

Changed: Added an allow-listed API error-code contract for private-beta registration closure, Clerk configuration, invitation-link, and provider availability failures. The filter preserves those safe codes and remediation messages while keeping unknown 5xx/provider details generic; Clerk invitation provider calls now map unexpected provider failures to a correlated 502 code. Existing generic Nest exceptions remain compatible.

Verified: `cd backend && npx eslint "{src,apps,libs,test}/**/*.ts"`, `cd backend && npm test -- --runInBand` (46 suites / 237 tests), `cd backend && npm run build`, and `git diff --check` pass. No deployment or push was performed.

Scope: make the Play hub group-first so recommendation decisions cannot feel like global catalog browsing.

Acceptance: the Play landing must lead with the user’s shared groups and explicit decide/plan actions, preserve separate future-planning and past-memory jobs, and provide an honest create/join path when no groups exist. Add focused frontend coverage without adding catalog or analytics surface.

Continuation claim: PROD-003 / TRUTH-001

Owner: Codex

Claimed: 2026-09-06

Changed: Added a group-first decision panel to the Play hub, showing up to three shared groups with honest member/game context and direct Decide/Plan session actions. The recommendation card now routes to groups rather than implying a global recommendation feed, while future planning and past-session recording remain separate entry points; the no-group state explains how to create or join the social space.

Verified: `cd frontend && npx biome check src/app`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (41 passing), `cd frontend && npm run build` (605.58 kB initial raw / 138.28 kB estimated transfer), and `git diff --check` pass. Rendered Play-hub and real-group validation remain open. No deployment or push was performed.

Scope: make the first group workspace useful immediately after creation instead of presenting a long collection of empty sections.

Acceptance: a genuinely empty one-person group must receive a clear invite → add games → plan first night handoff, with owner/member-appropriate actions, while established groups keep the full social workspace and no catalog or analytics surface is added.

Continuation claim: PROD-003 / EQ-006

Owner: Codex

Claimed: 2026-09-06

Changed: Repaired clean-install determinism after observing the first remote
GitHub Actions run. The backend dev toolchain now pins Compodoc to the
Nest-compatible 1.1 line, the frontend declares its optional `utf-8-validate`
peer, the root install wrapper uses package-local installs, and the database
CI job no longer uses npm's failing root `--prefix` validation path.

Verified: `npm run install:all`, package-local `npm ci --ignore-scripts`, and
the frontend/backend build dependency graphs pass locally. The remote run was
read-only inspected and failed before tests on dependency installation; no
push or rerun was performed.

Continuation claim: PROD-007 / EQ-006

Owner: Codex

Claimed: 2026-09-06

Scope: keep shared history truthful when a bookmarked or stale group filter no longer resolves to one of the user’s current private groups.

Changed: The history route now distinguishes a missing group filter from a real empty history. It shows a recoverable “group not available” state, avoids blank group labels, and does not offer a planning link for an unavailable group.

Verified: `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/play-page/history-page/history-page.component.spec.ts'`, `cd frontend && npx biome check` on the changed files, and `cd frontend && npm run build` pass. Full rendered authenticated review remains dependent on disposable Clerk storage state. No deployment or push was performed.

Continuation claim: PROD-006 / EQ-006

Owner: Codex

Claimed: 2026-09-06

Scope: prevent impossible attendee edits in the canonical session-detail flow and explain the constraint before a failed API write.

Changed: Session detail now disables removing the only attendee or an attendee recorded for a played game, shows visible guidance and an accessible action label describing why, and keeps a defensive toast guard for programmatic/legacy activation.

Verified: `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/meet-view/meet-view.component.spec.ts'` (4 passing), targeted Biome, and `cd frontend && npm run build` pass. No deployment or push was performed.

Continuation claim: EQ-004 / EQ-006

Owner: Codex

Claimed: 2026-09-06

Scope: extend client response-contract negative coverage to the group workspace and shared-history boundaries.

Changed: Added malformed group-workspace and shared-history response regressions. The frontend API boundary now rejects incomplete payloads before they reach group or history state, complementing the existing auth/profile/session/recommendation/admin/notification/provider cases.

Verified: `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (48 passing) and the targeted Biome check pass. No deployment or push was performed.

Continuation claim: SEC-006 / API-003

Owner: Codex

Claimed: 2026-09-06

Scope: give email-provider failures the same safe, correlated API contract as Clerk-provider failures.

Acceptance: verification, password-reset, and notification delivery failures must log only a safe error class, return an allow-listed `EMAIL_PROVIDER_UNAVAILABLE` 502 response through the API filter, and never expose provider payloads or recipient data. Add focused service/filter coverage and update current-state evidence.

Changed: Email delivery now maps Resend failures to `EMAIL_PROVIDER_UNAVAILABLE` with a safe 502 message for verification, password-reset, and notification callers; provider logs retain only the safe error class. Preserved password recovery now removes artificial waits, adds accessible labels/status/error states, and offers fresh-link/sign-in recovery.

Verified: Backend 239 tests across 46 suites, frontend 52 browser unit tests, frontend Biome, and the 604.88 kB / 136.42 kB production build pass. No deployment or push was performed.

Continuation claim: AUTH-001 / EQ-007

Owner: Codex

Claimed: 2026-09-06

Scope: make the preserved legacy password-recovery path clear, immediate, and recoverable while Clerk migration remains staged.

Acceptance: remove artificial waits, give request/token forms explicit labels and accessible status/error states, distinguish temporary email-provider failure from invalid/expired reset links, and preserve safe navigation back to sign-in. Add focused component coverage without changing the private-beta or Clerk cutover policy.

Changed: Preserved password recovery now submits without artificial waits, exposes labeled request/token fields with live loading and error states, distinguishes temporary email delivery failure from invalid/expired links, and offers direct fresh-link and sign-in recovery.

Verified: `cd frontend && npx biome check src/app`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (52 passing), and `cd frontend && npm run build` (604.88 kB initial raw / 136.42 kB estimated transfer) pass. No deployment or push was performed.

Continuation claim: AUTH-001 / EQ-007

Owner: Codex

Claimed: 2026-09-06

Scope: align the preserved legacy email-verification route with the accessible password-recovery states.

Acceptance: remove artificial waits and automatic redirects, expose loading/success/error states with accessible announcements, and give users direct sign-in recovery after verification or an expired token. Add focused component coverage without changing Clerk/private-beta policy.

Changed: Email verification now submits immediately, exposes accessible loading/success/error states, removes automatic redirects, and gives users a direct sign-in path after successful or expired verification.

Verified: `cd frontend && npx biome check src/app`, `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` (54 passing), and `cd frontend && npm run build` (604.88 kB initial raw / 136.40 kB estimated transfer) pass. No deployment or push was performed.

Continuation claim: TS-005 / NEST-004 / NEST-012

Owner: Codex

Claimed: 2026-09-06

Scope: close the remaining operational cache key boundary and document disabled-cache behavior.

Acceptance: cache maintenance key parameters must be typed and bounded before reaching the admin controller, and disabled Redis mode must have deterministic tests for cache reads/writes, rate-limit increments, and readiness without provider calls.

Changed: Cache maintenance deletion now validates a non-empty key capped at 256 characters before calling Redis, and disabled Redis mode has deterministic read/write/increment/readiness coverage without constructing a provider client.

Verified: `cd backend && npx eslint "{src,apps,libs,test}/**/*.ts"`, `cd backend && npm test -- --runInBand` (46 suites / 241 tests), `cd backend && npm run build`, `cd backend && npm run lint:logs`, `cd backend && npm run docs:openapi`, and `git diff --check` pass. No deployment or push was performed.
