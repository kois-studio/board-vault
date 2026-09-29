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

### [BOARD-002] [P1] [CI] Resolve Linux visual regression snapshot failures

- **Status:** Ready
- **Origin:** GitHub Actions on `main` after the collaboration workflow commit.
- **Goal:** Restore a passing `Frontend build and public E2E` check for the current landing page.
- **Why now:** The required job fails on four existing light/dark desktop/mobile screenshots, which blocks normal PR merges.
- **Scope:** Inspect the current rendered output in the matching Linux Playwright environment, update baselines if the current design is intended, or fix a confirmed rendering regression.
- **Non-goals:** Raising the pixel threshold without understanding the visual difference; changing landing-page design without review.
- **Acceptance criteria:**
  - The four landing-page visual tests pass on Linux.
  - Other public browser checks remain passing.
- **Verification:** Run the frontend E2E suite in the CI-equivalent environment and confirm the GitHub frontend job succeeds.
- **Affected areas:** `frontend/e2e/visual-regression.spec.ts`, its snapshot directory, and possibly frontend rendering code.
- **Dependencies:** Access to the CI-equivalent Playwright browser environment.
- **Risks:** Updating snapshots without visual review could hide a real regression.
- **Blocker or question:** None; determine the intended current page rendering during the work.
- **Next action:** Reproduce the mismatch in the Linux Playwright environment and inspect the expected/actual images.
- **Owner:** Frontend maintainer.
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
- **Next action:** Push the validated remediation, then confirm the alert rescan, required CI checks, and deployment result.
- **Owner:** Maintainer.
- **Last updated:** 2026-09-29
