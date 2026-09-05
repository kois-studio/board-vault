# Board Vault agent instructions

This is the canonical project-specific instruction file for AI developer agents. It is subordinate only to the user’s request and repository policies, and it must be read before changing code or project documentation.

## Read first

1. Read this file.
2. Read the [documentation index](README.md) and [standards contract](project-standards.yml).
3. Read [standards.md](standards.md), [architecture.md](architecture.md), and the relevant current-state document.
4. Read the linked `/todo/` workstream and claim exactly one task in the [agent task board](../todo/06-agent-task-board.md) before implementing product work.
5. Inspect the current source, configuration, and tests. A route name, TODO comment, old document, or UI label is not evidence that a capability works.

## Source-of-truth map

- Implemented architecture and boundaries: [architecture.md](architecture.md) and `backend/src/`, `frontend/src/`.
- Product thesis, sequencing, and acceptance intent: [todo/00-master-brief.md](../todo/00-master-brief.md) through [todo/07-product-truth-and-launch-readiness.md](../todo/07-product-truth-and-launch-readiness.md).
- API implementation: Nest controllers under `backend/src/modules/`; generated Swagger is served at `/swagger` when the API starts. Contract status is documented in [api.md](api.md).
- Data intent and current persistence adapter: [data-model.md](data-model.md), [database/](../database/), and `backend/src/modules/common/database/database.service.ts`.
- Environment, commands, deployment, and troubleshooting: [operations.md](operations.md).
- Security boundaries and findings: [security.md](security.md).
- Test inventory and verified baseline: [testing.md](testing.md).
- Standards gaps and remediation sequencing: [TODO.md](TODO.md) and the YAML contract.
- Durable decisions: [adr/README.md](adr/README.md). ADR-0001 is accepted for group-first product context, ADR-0002 for recommendation eligibility/scoring, ADR-0003 for the session domain, ADR-0004 for the staged Clerk rollout, ADR-0005 for token lifecycle, ADR-0006 for nested-user privacy, and ADR-0007 for invite-only group membership.

## Effective standards

The project pins Engineering Standards `0.2.0` at revision `34e2a8ffe9e081cdf755aa989ff16c375b7691f9`. Selected standards are documentation, testing, TypeScript, styling, security, dependencies, CI/CD, operations, API, data, and web. Selected profiles are Angular Application and NestJS Backend. The effective local rules are summarized in [standards.md](standards.md); auditable evidence and status live in [project-standards.yml](project-standards.yml). Compliance is evidence-based; `gap`, `partial`, `unknown`, and `deferred` are not equivalent to compliant.

## Safe change boundaries

- This project is in an intermediate product-restart and sanitation session. Do not perform broad behavior refactors, dependency upgrades, migrations, CI changes, or deployment changes unless the user explicitly scopes that work.
- Preserve unrelated changes and inspect `git diff` before editing overlapping files.
- Do not edit the live Turso database manually for feature work. Schema changes require a versioned migration plan first; use `database/scripts/migrate.mjs` and the documented baseline/recovery procedure.
- Never commit `.env` values, tokens, passwords, or provider credentials. The ignored `backend/.env` is local-only; document variable names and safe examples, never values.
- Treat backend authorization as the security boundary. Client guards, hidden buttons, and route access are not sufficient.
- Do not trust client-supplied identity fields such as `userId`, `accountId`, reviewer IDs, or owner IDs for sensitive decisions. This is a backlog non-negotiable and must be enforced server-side.
- Do not mark a `/todo/` task `DONE` without tests or a documented reason a test is not applicable, plus verification evidence.
- Keep product direction and implementation facts separate. If implementation reveals a product or data-model decision, update the relevant workstream before proceeding and create an ADR when the decision is durable.

## Verified commands

Commands can run from the repository root or package directory. Dependencies are currently present in ignored `node_modules/`; root, backend, and frontend package lockfiles are tracked and clean installs are reproducible locally.

| Purpose | Command | Current baseline |
|---|---|---|
| Backend install | `cd backend && npm ci --ignore-scripts` | Passes from the committed `backend/package-lock.json`; the package README now uses npm consistently. |
| Backend build | `cd backend && npm run build` | Passes. |
| Backend unit tests | `cd backend && npm test -- --runInBand` | Passes 208 tests across 44 suites covering Clerk identity provisioning, authorization, validation, token lifecycle, session transactions/lifecycle, organizer/current-membership enforcement, domain-level session participation invariants, per-game participation, recommendations, feedback, invitation visibility/expiry/atomic acceptance, verified-user gating, admin route/list-query validation, cache endpoint protection, safe API errors, health/readiness probes, canonical session reads, self-profile response privacy, and provider boundaries; broader integration coverage is still missing. |
| Backend e2e tests | `cd backend && npm run test:e2e -- --runInBand` | Passes 2 environment-safe HTTP boundary tests; the suite uses a disposable SQLite URL, disables Redis, and never calls production providers. |
| Backend lint, no mutation | `cd backend && npx eslint "{src,apps,libs,test}/**/*.ts"` | Passes with no errors or warnings. Do not use the package `lint` script casually because it includes `--fix`. |
| Backend formatting, writes files | `cd backend && npm run format` | Available; run only when formatting changes are in scope. |
| Frontend install | `cd frontend && npm ci --ignore-scripts` | Passes from the committed `frontend/package-lock.json`; Angular packages are pinned to a coherent 19.2 toolchain. |
| Frontend build | `cd frontend && npm run build` | Passes without Sass/selector/bundle-budget warnings; route-level components are lazy-loaded and the initial raw bundle is 599.13 kB (137.94 kB estimated transfer) under the 650 kB warning budget. |
| Frontend tests | `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` | Passes 25 browser-based unit tests, including collection activation guidance, schedule handoff/submission, session participant safeguards, group-history attendee summaries, upcoming-session social context labels, recommendation history context, attendee controls, and decision-lens semantics, accessible theme-control labels, valid and malformed self-profile/auth response-contract cases, canonical session detail/lifecycle contracts, direct collection-add, acquisition-board and recommendation-lens contracts, administrator pagination, and notification response contracts. |
| Frontend checks | `cd frontend && npx biome check src/app` | Passes with no diagnostics. |
| Frontend formatting, writes files | `cd frontend && npm run format` | Available; run only when formatting changes are in scope. |

The root package is dependency-free and exposes `npm run install:all`,
`npm run build`, `npm run test:unit`, `npm run test:e2e`, `npm run lint`, and
`npm run verify:migrations` as convenience wrappers around the package-local
commands. Backend `lint:check` is the no-mutation lint entry point; the
existing `lint` script remains the formatting/write command, and frontend
`lint:check` is the no-mutation Biome entry point.
| Database empty-state verification | `node database/scripts/verify-empty-state.mjs` | Passes against disposable SQLite, records the current snapshot baseline at migration 0005, and applies pending migrations. |

When reporting verification, include the exact command, working directory, result, and whether the result is a known baseline failure or introduced by the change.

## Documentation and ADR rules

- Update [docs/README.md](README.md) when adding or moving maintained documentation.
- Update current-state docs when architecture, commands, data, integrations, or operational behavior changes.
- Update the standards contract and [TODO.md](TODO.md) when a compliance state or remediation priority changes.
- Keep [TODO.md](TODO.md) as an active burn-down list: remove an item after its acceptance criteria are implemented and verified; record the completed scope and evidence in the relevant current-state document and the task board instead of leaving checked-off work in the active TODO.
- Before removing a TODO item, review every affected document under `docs/` for stale status, commands, contracts, risks, dependencies, and next actions. If the item is only partially complete, keep it with the remaining acceptance criteria explicitly narrowed.
- Create an ADR for a durable architectural, security, data, or policy decision. Do not use an ADR for a temporary TODO, defect, or status note.
- Never describe an unknown as compliant. Deferred work needs an explanation, dependency, and next action.
