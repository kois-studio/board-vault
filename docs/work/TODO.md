# Board Vault work queue

This is the authoritative repository-local queue for unfinished implementation,
review, discovery, and readiness work. GitHub issues may link back to these
items; they do not replace this queue. See the [agent instructions](../AGENTS.md)
and [standards contract](../project-standards.yml) for the continuation rules.

## Ready work

### [BOARD-001] [P2] [readiness] Complete the shared standards assessment

- **Status:** Ready
- **Origin:** project bootstrap review
- **Goal:** Record evidence-based compliance states for every applicable rule in the selected standards and profiles.
- **Why now:** The initial contract covers the rules most relevant to safe parallel development, but does not claim a complete technical audit.
- **Scope:** Review selected documentation, testing, TypeScript, security, dependency, CI/CD, operations, API, data, web, identity, Angular, NestJS, and Clerk rules; update the contract with evidence and actionable gaps.
- **Non-goals:** Broad refactors, framework upgrades, or changing product/security policy without separate approval.
- **Acceptance criteria:**
  - Every applicable selected rule has a status and evidence, or is explicitly marked not applicable with a reason.
  - Required gaps have a prioritized next action or a documented exception.
- **Verification:** Review the contract against the pinned standards revision and the current source tree; verify all local links.
- **Affected areas:** `docs/project-standards.yml`, `docs/AGENTS.md`, and relevant project documentation.
- **Dependencies:** None.
- **Risks:** A superficial assessment could misstate security or operational readiness.
- **Blocker or question:** None.
- **Next action:** Audit one standard/profile at a time, starting with security and identity.
- **Owner:** Maintainer or designated reviewer.
- **Last updated:** 2026-09-29

### [BOARD-003] [P1] [security] Remediate dependency advisories

- **Status:** In Progress
- **Origin:** npm and GitHub security audit notices observed during the local-development workflow work.
- **Goal:** Remediate dependency vulnerabilities in the backend and frontend while preserving application behavior.
- **Why now:** GitHub reported 180 open default-branch Dependabot alerts (4 critical, 96 high, 65 medium, 15 low) on 2026-09-29; both local npm audits also reported vulnerabilities.
- **Scope:** Upgrade affected direct and transitive dependencies, migrate incompatible framework major versions, add lockfile audits to CI, and enable scheduled Dependabot updates.
- **Non-goals:** Dismissing alerts without verified fixes or making unrelated product changes as part of the framework migration.
- **Acceptance criteria:**
-  - Backend and frontend `npm audit --audit-level=low` report no vulnerabilities.
-  - GitHub Dependabot alerts close after the updated lockfiles reach the default branch and GitHub rescans them.
  - Required CI checks pass and the deployment completes.
- **Verification:** Backend and frontend npm audits; repository lint, build, unit and E2E checks; database migration, restore and rollback checks; GitHub Dependabot and Actions status.
- **Affected areas:** `.github/dependabot.yml`, `.github/workflows/ci.yml`, `.nvmrc`, backend/frontend manifests and lockfiles, Angular compatibility changes, Nest configuration, and `docs/api/openapi.json`.
- **Dependencies:** GitHub default-branch Dependabot rescan and push-triggered CI/deployment.
- **Risks:** Framework major upgrades can introduce compatibility regressions. Angular 22's default `OnPush` strategy is intentionally accepted across existing components; address any observed behavior regressions if they arise. GitHub alert totals may take time to refresh after push.
- **Blocker or question:** None.
- **Next action:** Confirm the backend CI job passes after the Clerk-only push, which also overrides `js-yaml` for `@nestjs/swagger` (advisory GHSA-r3ph-w7gj-g6xm reported on 2026-09-30); then confirm the alert rescan and deployment result.
- **Owner:** Maintainer.
- **Last updated:** 2026-09-30

### [BOARD-004] [P2] [testing] Refresh the stale authenticated browser journeys

- **Status:** Ready
- **Origin:** Clerk-only verification run on 2026-09-30 against a local stack with development Clerk storage states.
- **Goal:** Make the opt-in authenticated Playwright journeys pass against the current UI.
- **Why now:** These journeys are skipped in CI, so drift is invisible. The same failures reproduce on `main` before the Clerk-only change.
- **Scope:** `auth-handoff-flow.spec.ts` expects the handoff screen while `/auth/clerk/status` is delayed, but the route guard waits for that call before the layout renders. `authenticated-core.spec.ts` expects a `Collection` heading and a group navigation without the `People` tab. `new-person-invitation-flow.spec.ts` stops at the Clerk bot-protection check on the invitee page because the Testing Token is installed after the ticket redirect.
- **Non-goals:** Changing product behavior only to satisfy an outdated assertion.
- **Acceptance criteria:**
  - Each journey passes against a local stack with development Clerk storage states, or its assertion is updated to the intended current behavior.
  - A documented helper produces the storage states (the app does not expose `window.Clerk`, so `@clerk/testing` sign-in helpers cannot be used directly).
- **Verification:** Run the journeys with the storage-state environment variables documented in the specs.
- **Affected areas:** `frontend/e2e/`, `docs/contributor-setup.md`.
- **Dependencies:** Development Clerk keys.
- **Risks:** Updating assertions without checking the intended UX could hide a real regression.
- **Blocker or question:** Whether the handoff screen should render while a guarded route is resolving.
- **Next action:** Decide the intended handoff behavior, then update the three specs.
- **Owner:** Frontend maintainer.
- **Last updated:** 2026-09-30
