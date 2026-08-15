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
- Durable decisions: [adr/README.md](adr/README.md). ADR-0004 is accepted for staged Clerk rollout; ADRs 0001–0003 remain proposals.

## Effective standards

The project pins Engineering Standards `0.2.0` at revision `34e2a8ffe9e081cdf755aa989ff16c375b7691f9`. Selected standards are documentation, testing, TypeScript, styling, security, dependencies, CI/CD, operations, API, data, and web. Selected profiles are Angular Application and NestJS Backend. The effective local rules are summarized in [standards.md](standards.md); auditable evidence and status live in [project-standards.yml](project-standards.yml). Compliance is evidence-based; `gap`, `partial`, `unknown`, and `deferred` are not equivalent to compliant.

## Safe change boundaries

- This project is in an intermediate sanitation/documentation session. Do not perform broad behavior refactors, dependency upgrades, migrations, CI changes, or deployment changes unless the user explicitly scopes that work.
- Preserve unrelated changes and inspect `git diff` before editing overlapping files.
- Do not edit the live Turso database manually for feature work. Schema changes require a versioned migration plan first; the current repository has no migration system.
- Never commit `.env` values, tokens, passwords, or provider credentials. The ignored `backend/.env` is local-only; document variable names and safe examples, never values.
- Treat backend authorization as the security boundary. Client guards, hidden buttons, and route access are not sufficient.
- Do not trust client-supplied identity fields such as `userId`, `accountId`, reviewer IDs, or owner IDs for sensitive decisions. This is a backlog non-negotiable and must be enforced server-side.
- Do not mark a `/todo/` task `DONE` without tests or a documented reason a test is not applicable, plus verification evidence.
- Keep product direction and implementation facts separate. If implementation reveals a product or data-model decision, update the relevant workstream before proceeding and create an ADR when the decision is durable.

## Verified commands

Commands run from the package directory. Dependencies are currently present in ignored `node_modules/`; no lockfile is tracked, so a clean install is not yet reproducible.

| Purpose | Command | Current baseline |
|---|---|---|
| Backend install | `cd backend && npm install` | Not verified in this session; lockfile is absent and the package README still says `pnpm`. |
| Backend build | `cd backend && npm run build` | Passes. |
| Backend unit tests | `cd backend && npm test -- --runInBand` | Passes focused profile-update, ownership, group-owner, group/membership listing, collection route ownership, invitation lifecycle, membership identity, invite-only join, notification ownership, meet-read, meet-account-game membership, admin reviewer, password-reset response, global-user-list, and deleted-account JWT suites; broader coverage is still missing. |
| Backend e2e tests | `cd backend && npm run test:e2e -- --runInBand` | Fails during module setup because `RESEND_API_KEY` is missing; it also contains a stale `/` “Hello World” assertion. |
| Backend lint, no mutation | `cd backend && npx eslint "{src,apps,libs,test}/**/*.ts"` | Fails with 17 errors and 3 warnings. Do not use the package `lint` script casually because it includes `--fix`. |
| Backend formatting, writes files | `cd backend && npm run format` | Available; run only when formatting changes are in scope. |
| Frontend install | `cd frontend && npm install` | Not verified in this session; no lockfile is tracked. |
| Frontend build | `cd frontend && npm run build` | Passes with Sass deprecation, selector, and initial bundle-budget warnings. |
| Frontend tests | `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless` | Passes 1 generated smoke test. |
| Frontend checks | `cd frontend && npx biome check` | Fails with 8 findings in 3 files. |
| Frontend formatting, writes files | `cd frontend && npm run format` | Available; run only when formatting changes are in scope. |

When reporting verification, include the exact command, working directory, result, and whether the result is a known baseline failure or introduced by the change.

## Documentation and ADR rules

- Update [docs/README.md](README.md) when adding or moving maintained documentation.
- Update current-state docs when architecture, commands, data, integrations, or operational behavior changes.
- Update the standards contract and [TODO.md](TODO.md) when a compliance state or remediation priority changes.
- Create an ADR for a durable architectural, security, data, or policy decision. Do not use an ADR for a temporary TODO, defect, or status note.
- Never describe an unknown as compliant. Deferred work needs an explanation, dependency, and next action.
