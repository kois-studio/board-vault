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

Reviewed: 2026-09-06

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

## Critical — unblock safe feature development

### READINESS-001 [Critical] SEC-003/SEC-008 — Complete object-level authorization audit

- **Status:** In progress
- **Affected area:** `backend/src/common/guards/`, `backend/src/modules/core/`, `backend/src/modules/features/`
- **Evidence:** SEC-001 has a runtime profile-update boundary and passing denied/filtered-input tests. SEC-002 protects user-scoped reads with `UserOwnershipGuard`, the deprecated global user listing with `AdminGuard`, deprecated arbitrary account creation has been removed, legacy group listings use account-scoped queries, every current collection route has ownership guards, legacy JWT validation rejects soft-deleted accounts, group and invitation/membership creation derives actor IDs from JWT, deprecated invitation creation now requires `GroupOwnerGuard` with URL/body group-ID support, reviewed group and meet reads use membership/owner boundaries, pending group-invitation reads are owner-only, legacy invitation list/detail reads are scoped to the authenticated sender or recipient, invitation lifecycle actions enforce sender/recipient ownership and atomically consume legacy invitations with membership creation, deprecated direct joining requires a pending invitation, legacy user-data controllers now require `VerifiedUserGuard`, legacy notification and meet-account-game mutations are scoped to the authenticated account, cache maintenance endpoints now require `JwtAuthGuard` and `AdminGuard`, and SEC-003 proposal review actions derive reviewers from the verified JWT behind `AdminGuard`; admin list queries now validate status, bounds, and search length, collection browse and duplicate-review query inputs are now typed and bounded, and group names are length-bounded; nested user responses use `UserPublicDto`, the authenticated self-profile uses `UserSelfDto`, and session lifecycle plus editable replacement writes now reject stale status races transactionally. The full session API/response-shape review remains open. V1 group membership is invite-only with owner/member roles under ADR-0007.
- **Risk:** Cross-user or cross-group data access and privilege escalation.
- **Next action:** Review remaining admin response shapes and decide whether same-status stale replacement writes need a versioned-write policy. Lifecycle transitions and terminal-race protection for editable session replacements now use conditional transactional status gates. Reopen group membership only through a new ADR if public groups or richer roles become necessary.
- **Dependencies:** None; coordinate with the canonical session/data decision.

### READINESS-002 [Critical] TS-005/NEST-004/API-002 — Activate boundary validation

- **Status:** In progress
- **Affected area:** `backend/src/main.ts`, DTO/type boundaries, `frontend/src/app/api/api.schemas.ts`
- **Evidence:** `backend/src/main.ts` now installs a global strict `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, and `transform`) as a safety net for DTO boundaries, while login, registration, password-reset, availability query, legacy token path, user profile-update, user game-update, review, collection ownership metadata, profile-proposal, administrator catalog/proposal-review, group, invitation, notification, session, and deprecated membership inputs retain targeted validation. High-risk request DTOs now bound credentials, free text, nested avatar fields, bulk game/tag/session arrays, and provider invitation identifiers/emails; the new request-boundary suite and existing controller tests pass. Verification/reset tokens now have persisted expiry and atomic one-time-use enforcement; migration 0002 is applied and integrity-verified in live Turso. Targeted Zod response schemas now validate every current frontend API adapter response, including legacy invitation/attendee/played-game compatibility writes; client negative tests and a complete legacy DTO inventory remain open.
- **Risk:** Malformed, unexpected, oversized, or unsafe values reach services, SQL, HTML, or client state.
- **Next action:** Audit remaining DTO decorators against the global pipe, then add client negative tests beyond the authentication boundary.
- **Dependencies:** API error contract and security review.

### READINESS-003 [Critical] DATA-001/DATA-002 — Reconcile schema and establish migrations

- **Status:** In progress
- **Affected area:** Turso deployment, `database/`, `backend/src/modules/common/database/`
- **Evidence:** The DATA-001 reconciliation is recorded in [`database/drift-report.md`](../database/drift-report.md). Migration 0003 defines and backfills `MeetAttendee`/`MeetGame`, backend detail/setup SQL is aligned, and the frontend `meetAttendees` route is now backed by organizer-only server authorization; the indirect `Game.title`/`GameTranslation` contract remains. Migrations 0002–0005 are applied, the schema snapshot and `SchemaMigrations` metadata are synchronized, the empty-state verification script passes through pending migration 0009, and a synthetic SQLite backup/restore rehearsal preserves representative accounts, group membership, session attendance, played games, translations, invitation history, and acquisition decisions while applying migrations 0006–0009. Migrations 0006–0009 remain pending for live Turso.
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
- **Evidence:** Backend now has 45 focused suites and 230 passing unit tests plus 2 environment-safe HTTP E2E tests; frontend has 32 browser-based unit tests plus four passing public Playwright tests, while seeded/integration journeys and authenticated browser coverage remain opt-in. The opt-in authenticated collection, invitation, session, recommendation, and acquisition-decision journeys pass against disposable Clerk development identities and data; a disposable provider-invitation rehearsal also proves create/list/revoke/removal; the full local Playwright run passes 13 tests with 3 guarded skips when the owner/recommendation/acquisition fixtures are supplied.
- **Risk:** Security and product regressions are invisible.
- **Next action:** Add negative authorization/contract cases, repeatable disposable fixture setup, and provider/remote integration evidence; preserve the existing authenticated core-loop journeys as launch regression gates.
- **Dependencies:** READINESS-001, READINESS-002, READINESS-003.

### READINESS-006 [High] CI-001/002/007 — Add CI gates

- **Status:** In progress
- **Affected area:** `.github/` or chosen CI provider
- **Evidence:** `.github/workflows/ci.yml` now runs a repository whitespace check, locked backend/frontend installs, backend tests/build/lint, frontend build/Biome/public Playwright checks, and disposable database migration verification. The local run passes backend lint, 230 backend tests, frontend build/Biome, and four public Playwright tests; authenticated E2E and deployment smoke checks are intentionally excluded because they require secret-bearing state.
- **Risk:** Build, test, lint, formatting, migration, and contract regressions reach integration/deployment.
- **Next action:** Observe the first GitHub Actions run and add non-production authenticated E2E when disposable Clerk state exists.
- **Dependencies:** A meaningful test baseline and the repository’s locked-install workflow.

### READINESS-007 [High] OPS-001/002/005/009 — Document environments and recovery

- **Status:** In progress
- **Affected area:** `backend/.env` contract, deployment configuration, Turso/Vercel/Resend/Upstash operations
- **Evidence:** A non-secret `backend/.env.example` now documents local/deployment variable names, and `/health` plus `/health/ready` provide dependency-free liveness and coarse Turso/Redis readiness states. Backup/restore ownership and rollback procedure remain open. On 2026-08-15 the old production Upstash hostname failed DNS resolution and caused an authenticated collection request to hit Vercel's 10-second timeout. Deployment `736b11f` now fails fast and cools down after provider failure; the authenticated collection smoke test passed on 2026-08-16; and a newly provisioned production Upstash database was verified through the cache probe and rate-limited authentication route on 2026-08-16.
- **Risk:** Unsafe startup, provider outage ambiguity, and unrecoverable deployment/data failures.
- **Next action:** Monitor the production Upstash quota, then document the real Turso backup schedule/owner/recovery target/rollback, provider-failure runbook, deployment ownership, and smoke checks for `/health` and `/health/ready`.
- **Dependencies:** Deployment owner and access to non-production infrastructure.

### READINESS-008 [High] SEC-006/OPS-007 — Make logs safe and diagnosable

- **Status:** Planned
- **Affected area:** `DatabaseService`, auth/email/cache services, logger middleware
- **Evidence:** `DatabaseService` excludes bound values from SQL logs, `EmailService` excludes recipient addresses, `CacheService` excludes keys/payloads, and auth/user-service logs exclude identity values; a global structured logging/redaction policy and provider-error correlation remain undocumented.
- **Risk:** Secret/PII exposure and poor incident diagnosis.
- **Next action:** Define structured events, remove value-interpolated SQL logging, redact sensitive fields, and test representative failures.
- **Dependencies:** Security owner and observability decision.

### READINESS-009 [High] API-001/003/004/007/NEST-016 — Stabilize API contracts

- **Status:** Planned
- **Affected area:** Swagger generation, `frontend/src/app/api/`, Nest controllers/DTOs
- **Evidence:** Runtime Swagger exists and the backend now applies `ApiErrorFilter`, returning a stable `{ statusCode, code, message, details?, requestId }` envelope with `X-Request-Id`; no versioned contract artifact, compatibility policy, or producer/consumer contract tests exist yet.
- **Risk:** Frontend/backend drift and unsafe breaking changes.
- **Next action:** Publish versioned OpenAPI/contract output, standardize errors/pagination, and test representative producer/consumer compatibility.
- **Dependencies:** READINESS-002 and canonical session/data model.

## Medium — launch quality and maintainability

### READINESS-010 [Medium] STYLE-004/WEB-001/WEB-003 — Sanitize frontend quality baseline

- **Status:** Planned
- **Affected area:** `frontend/src/styles.css`, component SCSS/templates, route surfaces
- **Evidence:** Tailwind global styles now use plain CSS with a PostCSS nesting pass; route-level components are lazy-loaded; production build has no Sass/selector/bundle-budget warnings and the initial raw bundle is 603.43 kB (137.99 kB estimated transfer) under the 650 kB warning budget. Shared theme-control semantics, the preserved-account auth fallback, migration-state copy, group/session empty states, owner-only invitation controls, invitation-decline confirmation, pending provider-invitation management, direct group-edit route loading/error states, mobile session-progress behavior, attendee-selection handoff, recommendation attendee controls, explainable recommendation lenses, reversible group acquisition interest, invitation-link copy feedback, and the personal/private collection boundary have been improved, but a full accessibility/responsive audit and all route-surface reviews remain open.
- **Risk:** Broken styles, poor mobile/accessibility behavior, and unsupported public claims.
- **Next action:** Complete the rendered route audit matrix, resolve remaining accessibility/responsive findings, and link content-truth findings to `TRUTH-001`.
- **Dependencies:** Product truth/brand decision where claims are involved.

### READINESS-011 [Medium] DOC-003/007/009 — Consolidate remaining legacy documentation

- **Status:** Deferred
- **Affected area:** root README, `backend/docs/`
- **Evidence:** New docs package now defines authority, but legacy backend docs and starter READMEs still include placeholders and framework boilerplate.
- **Risk:** Future agents follow stale or duplicated instructions.
- **Next action:** Relabel, redirect, merge, or archive remaining legacy docs without losing durable decisions.
- **Dependencies:** Keep current feature work out of this documentation-only cleanup.

### READINESS-012 [Medium] NEST-012/013/DATA-004/006 — Define persistence and cache boundaries

- **Status:** Deferred
- **Affected area:** core services, `DatabaseService`, `CacheService`
- **Evidence:** Concrete infrastructure is used directly; canonical session creation, scheduled-session creation, lifecycle transitions, played-game recording, group creation, and legacy invitation acceptance now use explicit Turso transactions. Remaining multi-write flows lack a complete transaction policy, and cache disabled mode/invalidation are untested.
- **Risk:** Partial writes, stale data, provider coupling, and test instability.
- **Next action:** Define adapter interfaces, transaction boundaries, cache ownership/invalidation, and provider fakes.
- **Dependencies:** READINESS-003 and canonical session model.

## Known unknowns

- Migration history, backup schedule, and database owner. The deployed schema baseline is owner-confirmed for this work, though not independently queried in this session.
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

- [ ] Complete responsive, keyboard, contrast, focus, and screen-reader
  behavior for the primary journeys. The core rendered audit now checks group,
  collection, session, upcoming, and history routes at 375px, 768px, and
  1280px for overflow and unnamed visible controls; keyboard-only, focus,
  contrast, screen-reader, and broader route review remain open.

## Collection and group activation

- [ ] Let a person add their first five useful games quickly, with reliable
  search, duplicate protection, ownership state, and persisted refresh state.
  The opt-in authenticated collection journey now proves first-game activation,
  duplicate protection, and refresh persistence; a local-only five-game fixture
  now proves the ready-state handoff. Real-group usefulness and catalog quality
  still need validation.
- [ ] Let an organizer create a private group and invite the actual people
  they play with.
- [ ] Complete invitation lifecycle behavior. The groups workspace now exposes
  pending invites with direct accept/decline actions, and the development
  provider flow now proves create/list/revoke/removal for real Clerk invitation
  identifiers. Legacy expiry, recipient acceptance after provider verification,
  retry behavior across provider/legacy flows, and notification clarity still
  need real-data validation.
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
  participants, active-to-completed lifecycle, and feedback. A fresh,
  repeatable two-account fixture now passes all of these behaviors; real-group
  usefulness remains part of the separate two-person acceptance rehearsal.
- [ ] Remove or hide incomplete compatibility flows once the canonical session
  journey replaces them.

## History and insights

- [ ] Validate the group home’s lightweight most-played, recently-played,
  revisit, and participation insights with real group history, then decide
  whether a separate analytics route is justified.
- [ ] Validate that history, group library, and recommendations show the same
  last-played and participant context after refresh. Group history cards now
  expose recorded attendees and session notes; validate this context with a
  real completed session and a zero-attendance-recorded edge case.

## Authentication, privacy, and trust

- [ ] Provide an explicit opt-in waitlist/“notify me when ready” path if launch
  notifications are wanted.
- [ ] Finish the preserved-account migration and retire legacy password/JWT
  registration only after recovery, rollback, and production verification pass.

## Reliability, quality, and launch readiness

- [ ] Document the real Turso backup/restore schedule, owner, recovery target,
  rollback procedure, and verify every pending migration against a clean
  environment before production rollout. The synthetic restore rehearsal is
  already passing locally.
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
  starter documentation, and naming inconsistencies.
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
