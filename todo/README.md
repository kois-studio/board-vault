# Board Vault agent TODO system

This directory is the execution contract for the Board Vault agent team.

The repository is a partially implemented product. Agents must use these documents as the shared source of truth for product direction, sequencing, boundaries, and completion criteria.

## Start here

1. Read [`00-master-brief.md`](./00-master-brief.md).
2. Read [`01-product-direction.md`](./01-product-direction.md).
3. Open [`06-agent-task-board.md`](./06-agent-task-board.md) and claim one task.
4. Read the workstream document linked by that task before editing code.
5. Inspect the current implementation. Do not assume that a TODO comment, an old document, or a route name represents a working feature.

## Workstreams

- [`01-product-direction.md`](./01-product-direction.md) — product thesis, persona, core loop, terminology, and non-goals.
- [`02-security-and-authorization.md`](./02-security-and-authorization.md) — P0 security fixes and object-level authorization.
- [`03-data-model-and-session-domain.md`](./03-data-model-and-session-domain.md) — canonical domain model, schema drift, migrations, and session semantics.
- [`04-core-product-loop.md`](./04-core-product-loop.md) — collection, groups, recommendations, sessions, history, and feedback.
- [`05-engineering-quality-and-delivery.md`](./05-engineering-quality-and-delivery.md) — tests, CI, contracts, observability, performance, accessibility, and maintainability.
- [`07-product-truth-and-launch-readiness.md`](./07-product-truth-and-launch-readiness.md) — remove unsupported claims, repair dead surfaces, and define launch gates.

## Task status

Use these statuses in the task board:

- `TODO` — ready to be claimed.
- `BLOCKED` — cannot progress because a dependency or decision is unresolved. Explain the blocker in the task entry.
- `IN_PROGRESS` — actively being implemented by one agent.
- `REVIEW` — implementation is complete and verification is pending.
- `DONE` — acceptance criteria and verification are complete.

Only one agent should own a task at a time. An agent may claim a task by adding its identifier and changing the status to `IN_PROGRESS`. Keep changes to the task board small and explicit so other agents can see ownership.

## Collaboration rules

- Keep the product thesis intact: the first flagship loop is “what should this group play tonight?”
- Prefer small vertical slices over broad unfinished refactors.
- Do not add a new feature if it expands the product surface without helping the core loop.
- Never weaken authorization to make a test or UI flow pass.
- Derive the acting user from the authenticated request. Do not trust a client-supplied `userId`, `reviewerId`, or owner ID for authorization decisions.
- Do not edit the live database manually as part of a feature task. Add a migration and document the rollout.
- Do not mark a task `DONE` without tests or a documented reason why a test is not applicable.
- If implementation reveals a product or data-model decision, update the relevant workstream document before continuing.
- Preserve unrelated user changes. Inspect `git diff` before editing overlapping files.

## Definition of done

A task is complete only when:

- the implementation is consistent with the canonical product and data-model decisions;
- unauthorized access and invalid input are covered by tests where relevant;
- happy path, empty state, error state, and loading state are handled for user-facing work;
- affected backend and frontend checks pass;
- documentation or API contracts are updated;
- no unsupported marketing or route claim was introduced;
- the task board records the result, verification, and any follow-up.

## Standard verification

Run the checks relevant to the changed area:

```bash
cd backend && npm run build
cd backend && npm test -- --runInBand
cd backend && npm run test:e2e -- --runInBand
cd backend && npx eslint "{src,apps,libs,test}/**/*.ts"
cd frontend && npm run build
cd frontend && npm test -- --watch=false --browsers=ChromeHeadless
cd frontend && npx biome check
```

The existing repository currently has build success but insufficient tests, lint failures, schema drift, and unfinished product flows. Treat those as known baseline conditions, not evidence that a new task is complete.
