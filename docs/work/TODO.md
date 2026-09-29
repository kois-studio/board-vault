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

### [BOARD-003] [P1] [security] Triage dependency advisories

- **Status:** Ready
- **Origin:** npm and GitHub security audit notices observed during the local-development workflow work.
- **Goal:** Identify and remediate reachable critical and high-severity dependency vulnerabilities without destabilizing the application.
- **Why now:** GitHub reported 179 default-branch alerts; the local production dependency audit also reported existing advisories.
- **Scope:** Refresh current audit data, identify affected direct/transitive packages and reachability, group compatible upgrades, and implement focused updates with regression coverage.
- **Non-goals:** Blind bulk upgrades or major framework migrations without compatibility analysis.
- **Acceptance criteria:**
  - Current advisories are triaged by severity, reachability, and exploitability.
  - Critical/high findings have a fix, mitigation, or documented reason and owner for deferral.
  - Relevant build, lint, unit, and E2E checks pass after upgrades.
- **Verification:** `npm audit` in backend and frontend, GitHub Dependabot review, and package-specific validation.
- **Affected areas:** `backend/package-lock.json`, `frontend/package-lock.json`, and potentially application code.
- **Dependencies:** None.
- **Risks:** Broad dependency changes can introduce behavior or compatibility regressions.
- **Blocker or question:** None.
- **Next action:** Refresh audit output and map critical/high advisories to affected packages.
- **Owner:** Maintainer.
- **Last updated:** 2026-09-29
