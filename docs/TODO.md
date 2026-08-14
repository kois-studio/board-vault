# Standards and AI-readiness TODOs

This backlog covers project sanitation and engineering readiness. It complements, but does not replace, the product execution board in [`todo/06-agent-task-board.md`](../todo/06-agent-task-board.md).

Statuses are `Planned`, `Blocked`, or `Deferred` until evidence changes them. Product work should remain in `/todo/`.

## Critical — unblock safe feature development

### READINESS-001 [Critical] SEC-003/SEC-008 — Complete object-level authorization audit

- **Status:** In progress
- **Affected area:** `backend/src/common/guards/`, `backend/src/modules/core/`, `backend/src/modules/features/`
- **Evidence:** SEC-001 has a runtime profile-update boundary and passing denied/filtered-input tests. SEC-002 protects user-scoped reads with `UserOwnershipGuard`, legacy group listings with account-scoped queries, group and invitation/membership creation derives actor IDs from JWT, reviewed group and meet reads use membership/owner boundaries, invitation lifecycle actions enforce sender/recipient ownership, deprecated direct joining requires a pending invitation, and legacy notification and meet-account-game mutations are scoped to the authenticated account; the broader group-join product decision and remaining legacy collection mutations still need review.
- **Risk:** Cross-user or cross-group data access and privilege escalation.
- **Next action:** Resolve the broader group-join product decision in `todo/01-product-direction.md`, then audit remaining legacy collection mutations and define the canonical session model.
- **Dependencies:** None; coordinate with the canonical session/data decision.

### READINESS-002 [Critical] TS-005/NEST-004/API-002 — Activate boundary validation

- **Status:** Planned
- **Affected area:** `backend/src/main.ts`, DTO/type boundaries, `frontend/src/app/api/api.schemas.ts`
- **Evidence:** No global `ValidationPipe`; frontend response schemas are a TODO.
- **Risk:** Malformed, unexpected, oversized, or unsafe values reach services, SQL, HTML, or client state.
- **Next action:** Select and enable server input validation, define client response schemas, and add negative tests.
- **Dependencies:** API error contract and security review.

### READINESS-003 [Critical] DATA-001/DATA-002 — Reconcile schema and establish migrations

- **Status:** Planned
- **Affected area:** Turso deployment, `database/`, `backend/src/modules/common/database/`
- **Evidence:** The current Turso export is recorded in `database/schema/schema.sql`; repository code still references absent `MeetAttendee`/`MeetGame` tables, and the deployed `Game` table has no `title` column even though the application passes one. No migration runner exists.
- **Risk:** Destructive drift, unrepeatable environments, and unsafe session-domain changes.
- **Next action:** Fix or retire stale SQL paths, record the drift report, then add numbered migrations from the confirmed baseline.
- **Dependencies:** Product decision on whether legacy meeting paths are retired or migrated; no deployment access required for the initial reconciliation.

### READINESS-013 [Critical] AUTH-001/AUTH-002 — Roll out and complete Clerk identity migration

- **Status:** In progress
- **Affected area:** `database/migrations/0001-add-clerk-user-id.sql`, Clerk deployment configuration, auth guards, frontend session controls
- **Evidence:** Clerk development setup, SDKs, token guard, exact-email identity bridge, additive live migration, sign-in controls, and one end-to-end existing-account link are complete. Turso reports integrity `ok`, with 15 accounts, 13 meets, 101 meet/game links, and one linked account; legacy JWT/password auth remains active.
- **Risk:** Premature cutover could strand users, break local foreign-key identity, or leave authenticated Clerk sessions without a local account.
- **Next action:** Add automated identity-link and recovery coverage, verify preserved meet history through authenticated routes, complete route/interceptor cutover, then remove legacy auth only after a documented rollback window.
- **Dependencies:** Production Clerk instance, authorized-party configuration, and identity-link test coverage.

### READINESS-004 [Critical] DEP-001/DEP-007/CI-003 — Make installation reproducible

- **Status:** Planned
- **Affected area:** `backend/.gitignore`, both package manifests, repository root
- **Evidence:** Lockfiles are explicitly ignored; backend README says pnpm while verified commands use npm; no runtime pin.
- **Risk:** Agents and CI resolve different dependency graphs.
- **Next action:** Choose npm or pnpm, commit lockfiles, pin/document Node, and add a clean-install smoke check.
- **Dependencies:** Owner decision on package manager.

## High — establish trustworthy delivery

### READINESS-005 [High] TEST-001/002/005 — Replace starter test baseline

- **Status:** Planned
- **Affected area:** `backend/test/`, backend `src`, frontend `src/**/*.spec.ts`
- **Evidence:** Backend unit command finds no tests; e2e is a stale root assertion; frontend has one generated test.
- **Risk:** Security and product regressions are invisible.
- **Next action:** Add auth/authorization/data tests first, then core-loop and frontend state tests.
- **Dependencies:** READINESS-001, READINESS-002, READINESS-003.

### READINESS-006 [High] CI-001/002/007 — Add CI gates

- **Status:** Deferred until READINESS-004
- **Affected area:** `.github/` or chosen CI provider
- **Evidence:** No CI configuration found.
- **Risk:** Build, test, lint, formatting, migration, and contract regressions reach integration/deployment.
- **Next action:** Run locked install, backend/frontend builds, tests, lint/format checks, and migration validation in CI; publish results.
- **Dependencies:** READINESS-004 and a meaningful test baseline.

### READINESS-007 [High] OPS-001/002/005/009 — Document environments and recovery

- **Status:** Planned
- **Affected area:** `backend/.env` contract, deployment configuration, Turso/Vercel/Resend/Upstash operations
- **Evidence:** Partial environment validation exists; no `.env.example`, health/readiness, backup/restore owner, or rollback procedure.
- **Risk:** Unsafe startup, provider outage ambiguity, and unrecoverable deployment/data failures.
- **Next action:** Add safe variable documentation, health checks, provider failure runbook, backup/restore rehearsal, and deployment ownership.
- **Dependencies:** Deployment owner and access to non-production infrastructure.

### READINESS-008 [High] SEC-006/OPS-007 — Make logs safe and diagnosable

- **Status:** Planned
- **Affected area:** `DatabaseService`, auth/email/cache services, logger middleware
- **Evidence:** Formatted SQL and user/provider context are logged without documented redaction or correlation.
- **Risk:** Secret/PII exposure and poor incident diagnosis.
- **Next action:** Define structured events, remove value-interpolated SQL logging, redact sensitive fields, and test representative failures.
- **Dependencies:** Security owner and observability decision.

### READINESS-009 [High] API-001/003/004/007/NEST-016 — Stabilize API contracts

- **Status:** Planned
- **Affected area:** Swagger generation, `frontend/src/app/api/`, Nest controllers/DTOs
- **Evidence:** Runtime Swagger exists, but no versioned contract artifact, error contract, compatibility policy, or contract tests.
- **Risk:** Frontend/backend drift and unsafe breaking changes.
- **Next action:** Publish versioned OpenAPI/contract output, standardize errors/pagination, and test representative producer/consumer compatibility.
- **Dependencies:** READINESS-002 and canonical session/data model.

## Medium — launch quality and maintainability

### READINESS-010 [Medium] STYLE-004/WEB-001/WEB-003 — Sanitize frontend quality baseline

- **Status:** Planned
- **Affected area:** `frontend/src/styles.scss`, component SCSS/templates, route surfaces
- **Evidence:** Build emits Sass deprecation and selector warnings; bundle exceeds warning budget; no accessibility/responsive audit; placeholder links remain.
- **Risk:** Broken styles, poor mobile/accessibility behavior, and unsupported public claims.
- **Next action:** Fix style integration, define route audit matrix, and link findings to `EQ-006`/`TRUTH-001`.
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
- **Evidence:** Concrete infrastructure is used directly; multi-write flows have no transaction policy; cache disabled mode and invalidation are untested.
- **Risk:** Partial writes, stale data, provider coupling, and test instability.
- **Next action:** Define adapter interfaces, transaction boundaries, cache ownership/invalidation, and provider fakes.
- **Dependencies:** READINESS-003 and canonical session model.

## Known unknowns

- Migration history, backup schedule, and database owner. The deployed schema baseline is owner-confirmed for this work, though not independently queried in this session.
- Vercel project settings, frontend hosting, domain/DNS ownership, production environment provisioning, and rollback path.
- Whether Upstash Redis is required in production or intended to remain optional.
- Supported Node/package-manager versions beyond the observed local runtime.
- Data retention, deletion, encryption, provider scopes, and privacy/terms ownership.
- Whether legacy route families are still consumed externally and which deprecated routes may be removed.
