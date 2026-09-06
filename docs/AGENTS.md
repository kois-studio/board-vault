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
| Backend install | `cd backend && npm ci --ignore-scripts` | Passes from the committed `backend/package-lock.json`; Compodoc is pinned to the Nest-compatible 1.1 line for clean Linux installs. |
| Backend build | `cd backend && npm run build` | Passes. |
| Backend unit tests | `cd backend && npm test -- --runInBand` | Passes 257 tests across 48 suites covering Clerk identity provisioning, authorization, validation and request-size boundaries, token lifecycle, session transactions/lifecycle, organizer/current-membership enforcement, domain-level session participation invariants, per-game participation, legacy played-game ownership validation, recommendations, feedback, atomic group acquisition interest/decision reopening, group acquisition ownership-race protection and owner decisions, invitation visibility/expiry/atomic acceptance, owner-only legacy invitation creation, provider invitation listing/revocation boundaries, soft-deleted account exclusion, verified-user gating, admin route/list-query validation, bounded browse/duplicate-review query inputs, typed/bounded cache maintenance parameters and disabled-cache behavior, atomic collection activation/removal/metadata/wishlist/review transitions, rollback on mid-write failures, safe API errors and stable private-beta/Clerk/email provider diagnostic codes, service-log redaction boundaries, health/readiness probes, canonical session reads, self-profile response privacy, and provider boundaries; broader integration coverage remains open. |
| Backend e2e tests | `cd backend && npm run test:e2e -- --runInBand` | Passes 6 environment-safe HTTP boundary tests covering unauthenticated Clerk status, invalid public input, and fail-closed group acquisition, recommendation, session scheduling, and collection activation routes; the suite uses a disposable SQLite URL, disables Redis, and never calls production providers. |
| Backend lint, no mutation | `cd backend && npx eslint "{src,apps,libs,test}/**/*.ts"` | Passes with no errors or warnings. Do not use the package `lint` script casually because it includes `--fix`. |
| Backend log boundary | `cd backend && npm run lint:logs` | Passes the source audit that allow-lists dynamic logger fields and rejects domain/entity identifiers in production log templates. |
| OpenAPI snapshot | `cd backend && npm run build && npm run docs:openapi` | Regenerates the committed [`docs/api/openapi.json`](api/openapi.json) contract snapshot from the same Nest module used by runtime Swagger. |
| Backend formatting, writes files | `cd backend && npm run format` | Available; run only when formatting changes are in scope. |
| Frontend install | `cd frontend && npm ci --ignore-scripts` | Passes from the committed `frontend/package-lock.json`; Angular packages are pinned to a coherent 19.2 toolchain and the optional WebSocket peer is explicit for clean CI installs. |
| Frontend build | `cd frontend && npm run build` | Passes without Sass/selector/bundle-budget warnings; route-level components are lazy-loaded and the initial raw bundle is 604.95 kB (136.36 kB estimated transfer) under the 650 kB warning budget. |
| Frontend tests | `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` | Passes 59 browser-based unit tests, including private collection-boundary and activation guidance, first-empty-group onboarding, group-first Dashboard/Collection decision handoffs, invitation-decline confirmation, pending Clerk invitation contracts, schedule handoff/submission, session participant safeguards, group-history attendee/player summaries and recommendation handoff, upcoming-session social context labels, recommendation history context, attendee controls, decision-lens context, accessible theme-control labels, availability-query encoding, valid and malformed auth/profile/group/history/session/recommendation/admin/notification/acquisition/invitation response-contract cases, canonical session detail/lifecycle contracts, direct collection-add, acquisition-board and recommendation-lens contracts, provider invitation rejection, false-success rejection, administrator pagination, notification response contracts, group-creation handoff, protected-route account-readiness gating, the social group-entry surface, coordination-inbox context, group-first Play entry, and accessible legacy password-recovery and email-verification states. |
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
