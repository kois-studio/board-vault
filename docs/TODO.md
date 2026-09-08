# Active completion TODOs

This is the active burn-down list for Board Vault’s unfinished product,
engineering, and launch work. It complements, but does not replace, the
product execution board in [`todo/06-agent-task-board.md`](../todo/06-agent-task-board.md).

Process rule: keep only unfinished acceptance criteria here. When a goal is
implemented and verified, remove it from this file in the same change, update
all affected current-state documents under `docs/`, and record the completed
scope and evidence in the task board. Do not turn this file into an archive of
checked boxes. Product direction that remains true after implementation belongs
in [`todo/01-product-direction.md`](../todo/01-product-direction.md); durable
technical decisions belong in [`docs/adr/`](adr/README.md).

Reviewed: 2026-09-08

Readiness entries use `In progress`, `Planned`, `Blocked`, or `Deferred`.
Product execution ownership remains in `/todo/`.

## Restart checkpoint — 2026-09-05

The product direction is now explicit and accepted: Board Vault is the social
decision-and-memory layer for recurring game groups. The shared group
workspace, collection context, recommendations, sessions, play history, and
lightweight insights are the product center. Game details are supporting
metadata only; catalog breadth, imports, public discovery, and a standalone
analytics platform are not restart priorities.

Priority order for the next iterations:

1. **P0 — Prove the flagship loop with two real accounts and clean data:**
   invite/accept, add games, select attendees, choose a recommendation lens,
   schedule, RSVP, start/complete, record attendance and per-game
   participants, give feedback, and confirm history survives refresh.
2. **P0 — Close safety and recovery gates:** finish object authorization and
   boundary-validation audits, preserve migration/backup/rollback evidence,
   and keep the private-beta registration policy closed by default.
3. **P1 — Remove product friction exposed by real use:** invitation lifecycle,
   first-five-games activation, acquisition decisions, privacy distinctions,
   compatibility-flow retirement, and refresh/permission truth.
4. **P1 — Make the evidence trustworthy:** authenticated browser journeys,
   contract/integration tests, CI remote observation, idempotency/error
   behavior, and provider-failure diagnostics.
5. **P2 — Finish quality after the loop is stable:** systematic responsive,
   keyboard, contrast, focus, screen-reader, content, and rendered-route
   review.

Do not expand catalog detail, global discovery, social feeds, mobile apps,
separate analytics routes, or complex recommendation scoring until the core
group loop demonstrates repeat use.

### Tech-lead reassessment — 2026-09-06

The landing, group setup, history, upcoming, and scheduling surfaces now share
one social-loop vocabulary and handoff model. The next implementation priority
is evidence, not more catalog surface: run the clean two-person acceptance
rehearsal against persisted data, then close provider-delivery, Turso recovery,
Clerk migration, and rendered accessibility gates. Advanced analytics and
game-detail breadth remain deferred until real groups demonstrate repeat use.

### Tech-lead / PM checkpoint — group management UX — 2026-09-06

The group workspace is now the product’s social center, but its management route
still presents an older CRUD-shaped interface with floating controls, weak action
hierarchy, and too little explanation of what membership and invitation changes
mean for shared history. The next UX slice is to make that route a responsive
management workspace organized around the owner’s real jobs: invite a known
member, invite a new person, review pending invitations, manage current members,
and understand the group’s shared shelf before using the destructive zone. This
does not expand game details or change authorization/mutation contracts. After
the redesign, the remaining priority returns to the two-account rehearsal and
rendered accessibility review.

### Tech-lead reassessment — after safe HTTP logging milestone — 2026-09-06

The request-correlation slice is complete and locally verified, but it does
not change the product priority: the first release still needs a trustworthy
two-person social loop. The next code slice is a narrow core-route quality
pass (keyboard/focus semantics, truthful states, and decision-oriented copy)
that can be validated without production writes. Broader service-log
redaction, provider-error mapping, Turso recovery ownership, Clerk cutover,
and real-group acceptance remain explicit release gates. Catalog breadth,
public discovery, and standalone analytics remain deferred.

### Tech-lead reassessment — after service-log redaction slice — 2026-09-06

The service-log audit now removes raw Zod/provider errors and user-entered
group names, game titles, usernames, tag names, and search terms from the
audited backend paths. The operational log boundary is materially safer, but
the release gate is not closed: provider/domain failures still need stable
diagnostic codes, the remaining numeric identifier policy needs a deliberate
allow-list, and real deployment observability/recovery ownership is still
unverified. The next product-facing priority remains the clean two-person
flagship loop, followed by rendered route review with real group data.

### Tech-lead reassessment — after CI install repair — 2026-09-06

The first remote validation run failed before tests because clean npm installs
were not reproducible across the backend/frontend dependency graphs. That is
now repaired locally and committed: package-local installs pass, the database
job avoids npm's root `--prefix` validation path, and every local build/test/
migration/restore/public-browser gate is green again. The next remote run is
still needed because this workspace cannot push by policy.

Product priority is unchanged: the next meaningful evidence is a disposable
two-person social-loop rehearsal. The development Clerk CLI is linked and can
issue short-lived impersonation URLs, but the collaborative preview cannot
navigate that third-party URL; no production identity or account was touched.
Do not use that tooling limitation as a reason to expand catalog/detail or
standalone analytics work.

### Tech-lead reassessment — after social-loop safety slices — 2026-09-06

The local history and session-detail passes removed two misleading paths from
the flagship loop: stale/private group filters now recover to the current
groups workspace, and session detail prevents impossible attendee removals
before they reach the API. The frontend unit suite is green at 46 tests and
the production build remains under its warning budget.

The remaining P0/P1 work is evidence and ownership rather than another broad
surface redesign: authenticated two-account acceptance, provider delivery and
failure paths, live migration/backup/rollback ownership, Clerk cutover and
recovery, the remote CI rerun after the local install repair, and the rendered
accessibility review with real group data. The collaborative preview is still
not providing inspectable snapshots, and the documented CLI workflow now
extracts/revokes development actor sessions safely. Catalog breadth, public
discovery, and standalone analytics remain deferred.

### Tech-lead reassessment — after default browser baseline and email boundary — 2026-09-06

The current local Playwright command discovers 26 tests: five public tests pass
without credentials and 21 tests are intentionally guarded until disposable
Clerk/browser fixtures are supplied. This is a healthy safety boundary, but it
must not be mistaken for authenticated release evidence. Email delivery now
maps Resend failures to a stable safe 502 code, so registration, reset, and
notification callers no longer expose arbitrary provider exceptions; real
delivery/failure rehearsal remains open.

The next product gate is still a real two-person social-loop rehearsal. The
next local engineering gates are the remaining provider/cache contract cases,
the complete DTO/object-authorization review, and a rendered accessibility
pass with real group data. The create-group route remains a focused setup
surface because it has meaningful onboarding content and lands directly in the
new group workspace; it is not an empty side page that needs to become a
dialog. Catalog/detail breadth remains deferred.

### Tech-lead reassessment — after preserved password-recovery UX — 2026-09-06

The preserved legacy recovery path now has immediate request/token feedback,
explicit form labels, retryable provider guidance, fresh-link recovery, and a
deliberate return to sign-in. This supports the staged Clerk migration without
expanding the old authentication surface into a second product identity.
Frontend coverage is now 54 browser-based unit tests and the production build
remains under budget. The recovery flow still needs rendered browser review;
legacy password/JWT retirement remains gated on real Clerk rollback evidence.

### Tech-lead reassessment — after cache boundary verification — 2026-09-06

The backend now has 241 passing tests across 46 suites, including bounded cache
maintenance inputs, deterministic disabled-cache behavior, stable email-provider
errors, and the preserved authentication recovery paths. The local production
build, lint, log audit, OpenAPI freshness check, migration verification, and
restore rehearsal are green. No disposable Clerk storage states are currently
available, so the two-account flagship rehearsal remains evidence rather than a
completed release gate.

The next self-contained engineering slice is to widen the frontend contract
negative matrix around the social handoffs (group decisions, recommendations,
session scheduling, and invitations). This protects the product's social core
without expanding game-detail or catalog scope. After that, the remaining work
still needs a real disposable authenticated rehearsal, rendered accessibility
review, remote CI observation, and operational recovery ownership.

The next data-integrity slice is now explicit: adding a game to a personal
collection must atomically write ownership, collection activity, and wishlist
cleanup, then invalidate the account activity cache once. This is valuable to
the group loop because collection ownership feeds shared recommendations and
history; it does not justify expanding the standalone game-details surface.

### Tech-lead reassessment — after atomic collection activation — 2026-09-06

Collection activation now commits ownership, activity memory, wishlist cleanup,
and the bounded activity-memory trim in one Turso transaction, then invalidates
the account activity cache once. Duplicate activation preserves the existing
conflict behavior, and the backend gate is now 245 tests across 47 suites.

This closes one concrete partial-write risk in the social loop, but it does not
close persistence work generally: proposal writes, remaining legacy mutations,
cache ownership, disposable integration, and recovery ownership remain open.
The next priority is a failure-path audit of the remaining core multi-write
flows, while keeping the two-account acceptance rehearsal and rendered route
review as the release evidence gates.

### Tech-lead reassessment — after atomic review memory — 2026-09-06

Review changes now write the review row and its rated activity memory in one
transaction, while review and collection-activity caches invalidate only after
the commit. The complete collection social-state write set is now covered by
254 backend tests across 48 suites.

Code-level DATA-004 is substantially healthier, but release readiness is not
implied by unit coverage. The next focus is failure-injection and HTTP
integration evidence for these boundaries, followed by the real two-account
acceptance loop, rendered UX review, remote CI observation, and backup/rollback
ownership. Catalog detail and discovery remain intentionally out of scope.

### Tech-lead reassessment — after transaction failure injection — 2026-09-06

The collection/review/group-decision transaction boundaries now prove rollback
on mid-write failures, not only successful commits. The backend gate is now 257
tests across 48 suites, with build and log audit green.

This closes a meaningful unit-level safety gate but is not a substitute for a
disposable database/provider integration rehearsal. The next priorities are
HTTP-level authenticated boundary evidence, remaining legacy/proposal mutation
review, the two-account social journey, rendered UX/accessibility, remote CI,
and operational recovery ownership.

### Tech-lead reassessment — after collection-state transaction completion — 2026-09-06

The collection social state is now transactionally consistent across add,
remove, ownership metadata updates, and wishlist toggles. Each transition
records bounded activity memory and invalidates the account activity cache only
after commit. The backend gate is now 252 tests across 47 suites.

This materially strengthens recommendation inputs and personal-to-group
handoffs. It does not close the broader persistence work: review/activity
coupling, proposal writes, legacy bulk updates, adapter boundaries, and
failure-injection coverage remain open. The product gate is still the real
two-account social loop plus rendered and operational evidence.

### Tech-lead reassessment — after atomic group acquisition signals — 2026-09-06

The group acquisition decision loop now commits member interest and reopening a
previously declined group decision in one transaction, preserving the social
meaning of “someone is interested again” under provider failure or races. The
backend gate is now 246 tests across 47 suites.

The remaining persistence priority is still a bounded audit of proposal and
legacy multi-write paths, not more catalog/detail functionality. Product
release evidence remains the clean two-account loop, rendered accessibility,
remote CI, provider delivery, and operational recovery ownership.

## Critical — unblock safe feature development

### READINESS-001 [Critical] SEC-003/SEC-008 — Complete object-level authorization audit

- **Status:** In progress
- **Affected area:** `backend/src/common/guards/`, `backend/src/modules/core/`, `backend/src/modules/features/`
- **Evidence:** SEC-001 has a runtime profile-update boundary and passing denied/filtered-input tests. SEC-002 protects user-scoped reads with `UserOwnershipGuard`, the deprecated global user listing with `AdminGuard`, deprecated arbitrary account creation has been removed, legacy group listings use account-scoped queries, every current collection route has ownership guards, legacy JWT validation rejects soft-deleted accounts, group and invitation/membership creation derives actor IDs from JWT, deprecated invitation creation now requires `GroupOwnerGuard` with URL/body group-ID support, reviewed group and meet reads use membership/owner boundaries, pending group-invitation reads are owner-only, legacy invitation list/detail reads are scoped to the authenticated sender or recipient, invitation lifecycle actions enforce sender/recipient ownership and atomically consume legacy invitations with membership creation, deprecated direct joining requires a pending invitation, legacy user-data controllers now require `VerifiedUserGuard`, legacy notification and meet-account-game mutations are scoped to the authenticated account, and the legacy per-account played-game create path rejects games not owned by any current member of the session group; cache maintenance endpoints now require `JwtAuthGuard` and `AdminGuard`, with typed/bounded cache-key parameters, and SEC-003 proposal review actions derive reviewers from the verified JWT behind `AdminGuard`; admin list queries now validate status, bounds, and search length, collection browse and duplicate-review query inputs are now typed and bounded, and group names are length-bounded; nested user responses use `UserPublicDto`, the authenticated self-profile uses `UserSelfDto`, and session lifecycle plus editable replacement writes now reject stale status races transactionally. The full session API/response-shape review remains open. V1 group membership is invite-only with owner/member roles under ADR-0007.
- **Risk:** Cross-user or cross-group data access and privilege escalation.
- **Next action:** Review remaining admin response shapes and decide whether same-status stale replacement writes need a versioned-write policy. Lifecycle transitions and terminal-race protection for editable session replacements now use conditional transactional status gates. Reopen group membership only through a new ADR if public groups or richer roles become necessary.
- **Dependencies:** None; coordinate with the canonical session/data decision.

### READINESS-002 [Critical] TS-005/NEST-004/API-002 — Activate boundary validation

- **Status:** In progress
- **Affected area:** `backend/src/main.ts`, DTO/type boundaries, `frontend/src/app/api/api.schemas.ts`
- **Evidence:** `backend/src/main.ts` now installs a global strict `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, and `transform`) as a safety net for DTO boundaries, while login, registration, password-reset, availability query, legacy token path, user profile-update, user game-update, review, collection ownership metadata, profile-proposal, administrator catalog/proposal-review, group, invitation, notification, session, and deprecated membership inputs retain targeted validation. High-risk request DTOs now bound credentials, free text, nested avatar fields, bulk game/tag/session arrays, provider invitation identifiers/emails, and the deprecated URL-based group-creation parameters; the request-boundary suite and existing controller tests pass. Verification/reset tokens now have persisted expiry and atomic one-time-use enforcement; migration 0002 is applied and integrity-verified in live Turso. Targeted Zod response schemas validate every current frontend API adapter response, while deprecated per-row attendee/played-game adapters have been removed from the client; malformed group/history response cases now join the existing client negative matrix, while broader negative coverage and a complete legacy DTO inventory remain open.
- **Risk:** Malformed, unexpected, oversized, or unsafe values reach services, SQL, HTML, or client state.
- **Next action:** Audit remaining DTO decorators against the global pipe, then extend the client negative matrix to the remaining lower-risk/legacy response paths.
- **Dependencies:** API error contract and security review.

### READINESS-003 [Critical] DATA-001/DATA-002 — Reconcile schema and establish migrations

- **Status:** In progress
- **Affected area:** Turso deployment, `database/`, `backend/src/modules/common/database/`
- **Evidence:** The DATA-001 reconciliation is recorded in [`database/drift-report.md`](../database/drift-report.md). Migration 0003 defines and backfills `MeetAttendee`/`MeetGame`, backend detail/setup SQL is aligned, and the frontend `meetAttendees` route is now backed by organizer-only server authorization; the indirect `Game.title`/`GameTranslation` contract remains. Migrations 0002–0005 are applied, the schema snapshot and `SchemaMigrations` metadata are synchronized, the empty-state verification script passes through pending migration 0009, and a synthetic SQLite backup/restore rehearsal preserves representative accounts, group membership, session attendance, played games, translations, invitation history, and acquisition decisions while applying migrations 0006–0009. A read-only Turso recheck on 2026-09-07 confirms live `SchemaMigrations` still ends at 0005 with integrity `ok`, no foreign-key violations, 16 active accounts, 5 groups, 13 sessions, and 22 session-game links. Migrations 0006–0009 remain pending for live Turso.
- **Risk:** Destructive drift, unrepeatable environments, and unsafe session-domain changes.
- **Next action:** Verify the attendee route through production with a preserved account, observe the CI migration/restore checks remotely, and document the real Turso backup schedule, owner, recovery target, and rollback procedure.
- **Dependencies:** Product decision on whether legacy meeting paths are retired or migrated; no deployment access required for the initial reconciliation.

### READINESS-013 [Critical] AUTH-001/AUTH-002 — Roll out and complete Clerk identity migration

- **Status:** In progress
- **Affected area:** `database/migrations/0001-add-clerk-user-id.sql`, Clerk deployment configuration, auth guards, frontend session controls
- **Evidence:** Clerk development setup, SDKs, token guard, verified-primary-email linking, new-account provisioning, protected-route Clerk session middleware, Clerk-aware frontend token transport, production-only CORS defaults, additive live migration, sign-in controls, focused identity tests, and one end-to-end existing-account link are complete. The migration-time verification preserved 15 accounts, 13 meets, and 101 meet/game links; a 2026-08-16 read-only probe now reports 16 active accounts, 13 meets, 101 links, and one linked Clerk account. Legacy JWT/password auth remains active.
- **Risk:** Premature cutover could strand users, break local foreign-key identity, or leave authenticated Clerk sessions without a local account.
- **Next action:** Exercise one preserved-data route and record rollback/recovery evidence before removing legacy auth. The production email/password/username signup and identity migration for Account `#1` passed; Google OAuth is intentionally deferred.
- **Dependencies:** Production Clerk instance/domain, Vercel environment access, authorized-party configuration, and a live deployment verification.

## High — establish trustworthy delivery

### READINESS-005 [High] TEST-001/002/005 — Replace starter test baseline

- **Status:** In progress
- **Affected area:** `backend/test/`, backend `src`, frontend `src/**/*.spec.ts`
- **Evidence:** Backend now has 48 focused suites and 266 passing unit tests plus 6 environment-safe HTTP E2E tests; frontend has 65 browser-based unit tests plus six passing public Playwright tests. The current default Playwright run discovers 33 tests, with 27 intentionally guarded without disposable Clerk/browser fixture state. The opt-in authenticated auth-handoff (including delayed success and fail → retry recovery), collection, first-group activation and recovery, invitation, invitation-choice and invitation-recovery branches, session, recommendation, acquisition-decision, settings, destructive-flow, and rendered-core journeys remain available; a disposable provider-invitation rehearsal also proves create/list/revoke/removal. Email-provider failure mapping across verification/reset/notification paths, Redis health cooldown behavior, schema-aware readiness, disabled-cache behavior, rollback paths including the deprecated bulk collection and proposal approval/rejection boundaries, and fail-closed core social routes now have focused coverage.
- **Risk:** Security and product regressions are invisible.
- **Next action:** Add remaining negative authorization/contract cases and provider/cache boundary evidence, preserve the authenticated core-loop journeys as launch regression gates, and observe them in a disposable environment with real Clerk state.
- **Dependencies:** READINESS-001, READINESS-002, READINESS-003.

### READINESS-006 [High] CI-001/002/007 — Add CI gates

- **Status:** In progress
- **Affected area:** `.github/` or chosen CI provider
- **Evidence:** `.github/workflows/ci.yml` now runs a repository whitespace check, clean backend/frontend installs, backend tests/build/lint, frontend build/Biome/public Playwright checks, the committed OpenAPI freshness check, and disposable database migration verification. The first remote run on 2026-09-06 failed before tests because the lock graph was not reproducible on the clean runner; locally, `npm run install:all` now passes after pinning the incompatible Compodoc toolchain and declaring the frontend optional WebSocket peer. The database job now installs from its package working directory instead of npm’s failing root `--prefix` validation path. Authenticated E2E and deployment smoke checks remain intentionally excluded because they require secret-bearing state.
- **Risk:** Build, test, lint, formatting, migration, and contract regressions reach integration/deployment.
- **Next action:** Observe the next GitHub Actions run after this local CI repair, then add non-production authenticated E2E when disposable Clerk state exists.
- **Dependencies:** A meaningful test baseline and the repository’s locked-install workflow.

### READINESS-007 [High] OPS-001/002/005/009 — Document environments and recovery

- **Status:** In progress
- **Affected area:** `backend/.env` contract, deployment configuration, Turso/Vercel/Resend/Upstash operations
- **Evidence:** A non-secret `backend/.env.example` now documents local/deployment variable names, and `/health` plus `/health/ready` provide dependency-free liveness and coarse Turso/Redis readiness states. Backup/restore ownership and rollback procedure remain open. On 2026-08-15 the old production Upstash hostname failed DNS resolution and caused an authenticated collection request to hit Vercel's 10-second timeout. Deployment `736b11f` now fails fast and cools down after provider failure; the authenticated collection smoke test passed on 2026-08-16; and a newly provisioned production Upstash database was verified through the cache probe and rate-limited authentication route on 2026-08-16.
- **Risk:** Unsafe startup, provider outage ambiguity, and unrecoverable deployment/data failures.
- **Next action:** Monitor the production Upstash quota, then document the real Turso backup schedule/owner/recovery target/rollback, provider-failure runbook, deployment ownership, and smoke checks for `/health` and `/health/ready`.
- **Dependencies:** Deployment owner and access to non-production infrastructure.

### READINESS-008 [High] SEC-006/OPS-007 — Make logs safe and diagnosable

- **Status:** In progress
- **Affected area:** `DatabaseService`, auth/email/cache services, logger middleware
- **Evidence:** HTTP logging now emits structured request-start/request-complete events with a server-generated correlation ID, `X-Request-Id`, method/path/status/duration fields, and no query string or authorization value; the real request path is preserved through `originalUrl` rather than Express’s router-relative `path`. `ApiErrorFilter` reuses that ID for unexpected failures. Focused middleware/filter regressions and the full backend gate pass. The service-log slice removes raw schema/provider exceptions from audited services, keeps email failures to safe error classes, removes user-entered values from operational messages, and now removes account/group/game/invitation/membership/notification/proposal/review/tag/meeting identifiers from domain logs. The remaining dynamic fields are an explicit safe allow-list for error classes and operational diagnostics; broader provider-boundary regressions remain open.
- **Risk:** Secret/PII exposure and poor incident diagnosis.
- **Next action:** Extend diagnostic/redaction tests to the remaining provider and domain boundaries; the executable dynamic-field allow-list now runs locally and in CI.
- **Dependencies:** Security owner and observability decision.

### READINESS-009 [High] API-001/003/004/007/NEST-016 — Stabilize API contracts

- **Status:** In progress
- **Affected area:** Swagger generation, `frontend/src/app/api/`, Nest controllers/DTOs
- **Evidence:** Runtime Swagger exists and the backend now applies `ApiErrorFilter`, returning a stable `{ statusCode, code, message, details?, requestId }` envelope with `X-Request-Id`. A versioned OpenAPI snapshot is now committed at [`docs/api/openapi.json`](api/openapi.json) and regenerated from the Nest module with `cd backend && npm run build && npm run docs:openapi`; CI checks that regeneration is clean. The snapshot now documents the nested game-detail ownership, wishlist, tag, and rating response shapes. Frontend response schemas and focused malformed-response tests cover representative consumer boundaries. Generated-client and broader producer/consumer compatibility tests remain open.
- **Risk:** Frontend/backend drift and unsafe breaking changes.
- **Next action:** Standardize pagination only on unbounded group-facing reads where real growth requires it, then expand producer/consumer compatibility tests for the core social routes. Defer generated-client adoption until those response shapes stabilize.
- **Dependencies:** READINESS-002 and canonical session/data model.

## Medium — launch quality and maintainability

### READINESS-010 [Medium] STYLE-004/WEB-001/WEB-003 — Sanitize frontend quality baseline

- **Status:** Planned
- **Affected area:** `frontend/src/styles.css`, component SCSS/templates, route surfaces
- **Evidence:** Tailwind global styles now use plain CSS with a PostCSS nesting pass; route-level components are lazy-loaded; production build has no Sass/selector/bundle-budget or Angular template warnings and the latest initial raw bundle is 609.00 kB (138.68 kB estimated transfer) under the 650 kB warning budget. Shared theme-control semantics, consistent keyboard focus rings, explicit session input labels, the preserved-account auth fallback, migration-state copy, group/session empty states, owner-only invitation controls, invitation-decline confirmation, pending provider-invitation management, direct group-edit route loading/error states, the responsive group-management workspace, mobile session-progress behavior, attendee-selection handoff, recommendation attendee controls, explainable recommendation lenses, reversible group acquisition interest, invitation-link copy feedback, the personal/private collection boundary, the routed shared-button focus-order fix, removal of unused client compatibility adapters, the history-to-recommendation handoff, player names in shared-memory cards, group-oriented recommendation context, explicit groups-index social actions, status-specific upcoming-session prompts, group-first Play entry, empty-group activation guidance, focus return for contextual destructive dialogs, the min-width/truncation fix for narrow group-management member rows, the full-page Clerk account handoff, Clerk-aware sign-out, and distinct existing-account versus new-invitee invitation handoffs have been improved. The opt-in rendered core audit now checks overflow, visible control names, duplicate routed-button focus stops, and keyboard traversal at 375px, 768px, and 1280px across the primary authenticated routes; human contrast, screen-reader, content, broader route, and provider-failure review remain open.
- **Risk:** Broken styles, poor mobile/accessibility behavior, and unsupported public claims.
- **Next action:** Extend the audit only to the remaining high-value authenticated surfaces, perform human keyboard/screen-reader/content review, and link content-truth findings to `TRUTH-001`; keep catalog/detail expansion out of scope.
- **Dependencies:** Product truth/brand decision where claims are involved.

### READINESS-011 [Medium] DOC-003/007/009 — Consolidate remaining legacy documentation

- **Status:** Deferred
- **Affected area:** root README, `backend/docs/`
- **Evidence:** New docs package now defines authority, but legacy backend docs and starter READMEs still include placeholders and framework boilerplate.
- **Risk:** Future agents follow stale or duplicated instructions.
- **Next action:** Relabel, redirect, merge, or archive remaining legacy docs without losing durable decisions.
- **Dependencies:** Keep current feature work out of this documentation-only cleanup.

### READINESS-012 [Medium] NEST-012/013/DATA-004/006 — Define persistence and cache boundaries

- **Status:** In progress
- **Affected area:** core services, `DatabaseService`, `CacheService`
- **Evidence:** Concrete infrastructure is used directly; canonical session creation, scheduled-session creation, lifecycle transitions, played-game recording, group creation, legacy invitation acceptance, collection add/remove/metadata/wishlist transitions, group acquisition signal reopening, the deprecated bulk collection update, and administrative proposal approval/rejection now use explicit Turso transactions. Collection transitions trim bounded activity memory within the same transaction and invalidate the account activity cache once after commit; proposal caches invalidate only after the corresponding approval or rejection commit. Disabled Redis reads/writes, rate-limit increments, and readiness now have deterministic coverage; remaining review/activity coupling, adapter boundaries, and cache ownership/invalidation completeness remain open.
- **Risk:** Partial writes, stale data, provider coupling, and test instability.
- **Next action:** Define adapter interfaces, transaction boundaries, cache ownership/invalidation, and provider fakes; add integration coverage where provider state can be disposable.
- **Dependencies:** READINESS-003 and canonical session model.

## Known unknowns

- Migration history, backup schedule, and database owner. The live migration markers, schema integrity, foreign-key state, primary location, and aggregate row counts were independently queried read-only on 2026-09-06; no scheduled backup policy or recovery owner is exposed by the available Turso CLI output.
- Vercel project settings, frontend hosting, domain/DNS ownership, production environment provisioning, and rollback path.
- Upstash Redis is explicitly optional only for local development; production authentication rate limiting requires it enabled and configured.
- Supported Node/package-manager versions beyond the observed local runtime.
- Data retention, deletion, encryption, provider scopes, and privacy/terms ownership.
- Whether legacy route families are still consumed externally and which deprecated routes may be removed.
- Whether the applied auth-token migration has been promoted to every future environment; rows without expiry values intentionally fail closed, and the runner now provides the mechanism for parity while CI/deployment integration remains open.

---

# Goals before calling the product “finished”

This is the product completion checklist. “Finished” means the core social
loop is useful and trustworthy for a real group of friends; it does not mean
that Board Vault has become a complete board-game encyclopedia. Game details
remain supporting metadata only. The product must stay focused on helping a
group decide what to play, organize what the group owns, remember what it
played, and make better future decisions.

Product principles and out-of-scope boundaries are maintained in
[`todo/01-product-direction.md`](../todo/01-product-direction.md), not repeated
as TODO items here.

## Information architecture and UX

- [ ] **P0 — Review the product as connected user flows (UX-FLOW-001).**
  Use [`docs/ux-flows.md`](ux-flows.md) as the review contract: map the primary
  path, role/data branches, recovery states, destructive actions, shared-state
  checkpoints, and evidence for each flagship job. The first priority is one
  clean two-account journey from landing or dashboard through create group,
  invite, add games, recommendation, first planned session, and the resulting
  shared memory. The fixture-gated browser journey now passes locally from
  group creation through existing-account invitation and acceptance, collection
  activation, an explainable recommendation, first-session planning, and member
  leave back to the groups dashboard. The run also exposed and fixed missing
  native submit handlers in group creation and group management. Connected
  recovery evidence now also covers temporary creation failure → durable alert
  → retry, invitation choice covers keep-it and explicit decline, and provider
  invitation failure covers preserved email → successful retry.
  Screen-level tests still do not satisfy this ticket on their own: new-person
  registration through the provider challenge, expiry/refresh/unavailable-group
  variants, and human UX review remain open.

- [ ] **P0 — Redesign authentication onboarding end to end (AUTH-UX-001).**
  The production path exposed a confusing handoff: after a signed-out visitor
  completed authentication, the header showed a faint loading/status message
  while local-account validation and Clerk linking happened, then navigation
  changed underneath them. The first implementation now centralizes and
  deduplicates the Clerk-to-local readiness state, replaces the header-only
  status with an explicit full-page handoff and recoverable error state, and
  routes a successful public auth entry to the dashboard. Invitation
  registration now distinguishes an already-registered recipient, who can
  continue without replacement credentials, from a new invitee who must
  create them. The state map is documented in
  [`docs/authentication.md`](authentication.md). Remaining acceptance is
  authenticated browser coverage for invitation registration through the
  provider challenge, plus human checks of sign-out, refresh/back
  navigation, keyboard focus, and screen-reader behavior. The sign-in handoff
  has now been rendered and visually reviewed at 375px and 1280px against a
  delayed local boundary, with both journeys completing into the dashboard; a
  separate disposable provider-failure rehearsal also reached the error state
  and recovered through retry. The authentication contract and private-beta
  policy remain unchanged.

- [ ] Complete responsive, keyboard, contrast, focus, and screen-reader
  behavior for the primary journeys. The core rendered audit now checks group,
  collection, session, upcoming, and history routes at 375px, 768px, and
  1280px for overflow and unnamed visible controls; keyboard-only, focus,
  contrast, screen-reader, and broader route review remain open. The audit now
  also guards the shared routed-button focus boundary and caught/fixed a
  duplicate custom-element tab stop; human keyboard and assistive-technology
  review is still required.
- [ ] Complete the product-facing UX pass for the public landing, group setup,
  and history/memory surfaces. The PM/PO checkpoint on 2026-09-06 decided that
  landing should explain the social decision-and-memory loop, group creation
  should remain a focused setup route with an explicit next-step handoff, and
  history should be group-aware shared memory rather than a generic analytics
  page. The core action styles now expose a consistent keyboard focus ring;
  session date and notes controls use explicit labels; and history/upcoming
  failures announce themselves as alerts. The group home now also avoids
  showing a false zero-session pulse while shared history is loading, and its
  history loading state is announced. Successful group creation now returns
  the new group ID and opens that group workspace directly, where inviting
  friends and planning the first session are visible next actions. Rendered
  and real-group validation remain open after implementation. The create form
  also keeps submission disabled with an explicit status while the local
  authenticated account profile is still loading, avoiding an ambiguous
  busy state on direct navigation. Destructive group actions now stay in
  context: owners confirm deletion from management, members confirm leaving
  from the group workspace, and the former sparse full-screen pages are no
  longer the user-facing flow. Focus return and real-group validation remain.
  The contextual delete/leave dialogs now focus their safe cancel action on
  open and restore focus to the trigger after cancellation; rendered and
  screen-reader review remain open.
  The groups index now presents each group as a social workspace entry with
  explicit decision, planning, history, and invitation actions rather than a
  single dense clickable card; rendered group-index review remains open.
  A genuinely empty one-person group now receives a focused invite → add games
  → plan first night handoff before the longer workspace sections, with
  owner/member-appropriate actions; established groups keep the full social
  workspace.
  Group management is now also organized around the owner’s real social jobs:
  inviting an existing member or a new person, reviewing pending invitations,
  managing current members, understanding the shared shelf, and reaching the
  danger zone deliberately. The route remains a full management workspace for
  now; whether invitation composition should become an in-context dialog needs
  validation with a real owner/member pair. History now keeps a deep-linked
  group filter selected after async group options arrive and replaces failed
  game artwork with a readable title-initial fallback; broader visual,
  keyboard, and real-group review remain open.

### Tech-lead reassessment — after group management UX — 2026-09-06

The group-management redesign now makes the social owner workflow legible, but
rendered owner/member validation is still open because the authenticated fixture
is intentionally not run by default. The next bounded engineering slice is the
remaining deprecated bulk collection mutation: it currently performs multiple
ownership writes outside a transaction. Making that compatibility boundary
atomic reduces partial-state risk without expanding the catalog or changing the
canonical social collection flow. After this safety slice, priority returns to
the real two-account rehearsal and rendered route validation.

### Tech-lead reassessment — proposal persistence boundary — 2026-09-06

The deprecated bulk collection path is now atomic and rollback-tested. The next
remaining multi-write risk is administrative proposal approval: it currently
creates a game, its translations and tags, changes proposal state, and sends a
notification through separate service calls. This is not a reason to expand the
catalog product; it is a bounded integrity fix so an admin action cannot leave
half-created catalog data. Rejection/duplicate notification behavior remains a
separate lower-priority boundary, and the social two-account rehearsal remains
the release gate.

### Tech-lead reassessment — proposal rejection boundary — 2026-09-06

Approval and rejection are now atomic and rollback-tested, including their
submitter notifications. Duplicate marking intentionally keeps its existing
no-notification behavior. Admin/catalog persistence work now pauses and the
priority returns to the real social loop, rendered route review, and operational
launch gates.

### Tech-lead reassessment — clean two-account rehearsal — 2026-09-07

The flagship local social loop now passes with two disposable Clerk identities
and persisted local data: RSVP, refresh, session start, attendance, per-game
participants, completion, feedback, retryable loading, shared history, and the
recommendation handoff all work together. The rendered core audit also passes
the group, management, session, collection, upcoming, and history routes at
375px, 768px, and 1280px without overflow or unnamed visible controls.

This is strong implementation evidence, not release readiness. The next work
is to convert the opt-in audit into a broader repeatable gate, inspect the
landing and history surfaces with human keyboard/content judgment, and close
operational recovery and provider-failure evidence. No catalog breadth or
standalone analytics work is justified by this rehearsal.

### Tech-lead reassessment — rendered keyboard/responsive audit — 2026-09-07

The first automated core-route audit found a real narrow-screen defect in the
group-management member rows: long names and the member action could force the
workspace wider than a 375px viewport. The member cards and list rows now allow
their content to shrink and truncate, and the regression passes. The audit also
now waits for the routed main content, traverses visible controls by keyboard,
checks that focus stays visible and named, and covers the group, management,
session planning/detail, collection, upcoming, and history routes at 375px,
768px, and 1280px. This closes the automated core-route slice, not the whole
quality gate: human keyboard/screen-reader/contrast/content review, broader
authenticated route coverage, provider/cache failure evidence, and operational
recovery remain open.

### Tech-lead reassessment — provider degradation evidence — 2026-09-07

The local reliability boundary now proves that verification, password-reset,
and notification delivery failures map to the same safe email-provider error
without logging recipient data, and that Redis health failures enter a cooldown
instead of causing repeated probes. The operations docs now contain a
read-only provider-degradation runbook for `/health`, `/health/ready`, email
diagnostic codes, Redis degradation, and Turso recovery boundaries. This is
local failure evidence only: real email delivery/CAPTCHA behavior, remote CI,
production monitoring, and Turso backup ownership still require external
verification. The next product-facing gate remains a clean real-world
two-person acceptance rehearsal; no catalog or standalone analytics expansion.

## Collection and group activation

- [ ] Let a person add their first five useful games quickly, with reliable
  search, duplicate protection, ownership state, and persisted refresh state.
  The opt-in authenticated collection journey now proves first-game activation,
  duplicate protection, and refresh persistence; a local-only five-game fixture
  now proves the ready-state handoff. Real-group usefulness and catalog quality
  still need validation.
- [ ] Let an organizer create a private group and invite the actual people
  they play with. The groups index now makes the workspace handoff and the
  next decision/planning actions explicit; real invitation and first-group
  activation remain open.
- [ ] Complete invitation lifecycle behavior. The groups workspace now exposes
  pending invites with direct accept/decline actions, and the development
  provider flow now proves create/list/revoke/removal for real Clerk invitation
  identifiers. Fresh local browser evidence also proves owner invite, recipient
  refresh, existing-account acceptance, and post-acceptance group visibility.
  The custom ticket path proves disposable recipient acceptance, session
  activation, and group-dashboard handoff with Smart CAPTCHA temporarily
  disabled only in development. Human CAPTCHA, legacy expiry, provider
  delivery, legacy failure/retry behavior, and notification clarity still need
  real-data validation. The registration error state now explains expired/used
  tickets and unavailable groups and provides a route that clears the stale
  ticket before a fresh invitation is used.
- [ ] Complete the group library decision surface. It now shows owners, member
  ratings, player range, duration, play count, and timezone-aware last-played
  context; the acquisition search and board now exclude games already owned by
  any member, including after an ownership race. Real-group validation is still
  needed so the group can move from “we can play this” to “we should acquire
  this” without a catalog detour.
## Recommendation and acquisition decisions

- [ ] Validate the current recommendation decision lenses with real group
  usage; expand context only when it improves a concrete group decision. The
  backend rules and explainable result contract are covered, and a disposable
  authenticated browser journey now proves the lens, explanation, persisted
  feedback, and planning handoff; real-group usefulness is still unvalidated.
- [ ] Extend the current explainable ranking with history, replay timing, and
  complexity fit only after the group has enough persisted play data.
- [ ] Validate the recommendation-to-acquisition decision flow with real group
  usage; purchase suggestions must remain group decisions rather than a generic
  catalog or affiliate-shopping surface. The current acquisition board is an
  explicit shared-interest shortlist with owner-controlled open/planned/not-now
  resolution, not a purchase workflow; disposable browser coverage passes, but
  real-group usefulness and decision language still need validation.

## Sessions and social participation

- [ ] Validate the complete session flow through authenticated browser coverage,
  including refresh, retryable failures, RSVP, attendance, per-game
  participants, active-to-completed lifecycle, and feedback. Session detail
  now also blocks removing the only attendee or a person still recorded for a
  played game. A fresh,
  repeatable two-account fixture now passes all of these behaviors, including
  visible history-card assertions after the route-readiness fix; real-group
  usefulness remains part of the separate two-person acceptance rehearsal.

## History and insights

- [ ] Validate the group home’s lightweight most-played, recently-played,
  revisit, and participation insights with real group history, then decide
  whether a separate analytics route is justified.
- [ ] Validate that history, group library, and recommendations show the same
  last-played and participant context after refresh. Group history cards now
  expose recorded attendees and session notes; validate this context with a
  real completed session and a zero-attendance-recorded edge case. Stale or
  unauthorized history group filters now recover to the groups workspace
  instead of rendering an empty group label or an invalid planning link. The
  fresh two-account rehearsal now completes a session, confirms its shared
  history card, and confirms the same game remains marked “Last played” in the
  group library after a full refresh; recommendation context and the
  zero-attendance edge case remain open.

## Authentication, privacy, and trust

- [ ] Provide an explicit opt-in waitlist/“notify me when ready” path if launch
  notifications are wanted.
- [ ] Finish the preserved-account migration and retire legacy password/JWT
  registration only after recovery, rollback, and production verification pass.
  Production Clerk’s private-beta configuration is now verified read-only:
  sign-up mode is restricted, required username/password settings match the
  invitation form, email verification is enabled, and Smart CAPTCHA is on.
  Migration recovery, rollback, and legacy-auth retirement remain open.

## Reliability, quality, and launch readiness

- [ ] Document the real Turso backup/restore schedule, owner, recovery target,
  rollback procedure, and verify every pending migration against a clean
  environment before production rollout. A fresh read-only production export
  has now been integrity-checked and migrations 0006–0009 have been rehearsed
  successfully against that copy; the schedule, owner, recovery target, and
  live rollout/rollback procedure remain open. The synthetic restore rehearsal
  is also passing locally.
- [ ] Complete the authorization, input-validation, API-contract,
  logging/redaction, cache, and provider-failure reviews.
- [ ] Expand automated coverage for auth, authorization, collection activation,
  invitations, recommendations, session lifecycle, and core frontend states.
  Disposable browser journeys now cover collection activation, invitations,
  recommendations, and the two-account session loop; repeatable fixture setup
  and negative request-boundary cases are in place, while provider failure and
  broader authorized integration coverage remain.
- [ ] Keep production configuration documented without committing secrets;
  verify Turso, Clerk, Resend, Upstash, CORS, health checks, and rollback paths.
- [ ] Remove remaining dead routes, placeholder links, misleading copy, stale
  starter documentation, and naming inconsistencies. The old group leave and
  delete pages have been removed and their URLs now use explicit compatibility
  handoffs; the Security page’s disabled deletion placeholder is now truthful
  policy copy; the broader route and documentation inventory remains open.
- [ ] Resolve remaining frontend baseline lint/format findings and complete the
  rendered accessibility/responsive route audit; the production build warning
  and initial bundle work is verified locally.
- [ ] Run a two-person real-world acceptance rehearsal on a clean environment. The upcoming-session surface now exposes group-first context, human-readable status, and saved planning notes; the rehearsal must still validate that this context is useful to both organizers and attendees with real data.

## Definition of finished

The product can be called finished for its first release when two real accounts
can create or join a private group, add the group’s games, get an explainable
recommendation for a concrete game night, plan and attend a session, record the
games actually played, give lightweight feedback, and see that history improve
the next recommendation. The flow survives refresh, respects permissions,
works on mobile and keyboard, and can be operated and recovered safely.
