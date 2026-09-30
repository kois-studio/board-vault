# Board Vault agent instructions

## Read first

Start with the root [README](../README.md), [contribution guide](../CONTRIBUTING.md),
and this [documentation index](README.md). Then consult the relevant current-state
documents below before changing behavior:

- [Project standards contract](project-standards.yml) for selected standards,
  the pinned shared standards revision, and assessed gaps;
- [Architecture overview](architecture.md), [data model](data-model.md), and
  [authentication](authentication.md) for system boundaries;
- [Contributor setup](contributor-setup.md) and [operations](operations.md)
  for local configuration and environment boundaries;
- the relevant [ADR](adr/README.md) for durable product, API, privacy, identity,
  and data decisions; and
- [work queue](work/TODO.md) for unfinished implementation, review, and
  readiness work.

## Source of truth

- This repository owns implementation, API, data, and operational facts.
- The private `kois-context` repository owns shared Kois strategy and access
  context. It is supplementary and must not be required to run local development.
- `docs/project-standards.yml` records the shared standards version and the
  currently assessed rules. Unassessed rules are unknown, not compliant.
- `docs/work/TODO.md` is the repository's authoritative unfinished-work queue.
  GitHub issues may link to items but do not replace the queue unless that
  policy is changed here.
- ADRs record durable decisions; they are not task lists. Update the relevant
  current-state documentation when an accepted decision changes.

## Safe change boundaries

- Routine development uses the checkout-local SQLite database and synthetic
  `+clerk_test` fixture accounts from `npm run local:setup`.
- Never use production credentials or data for development or tests. Keep
  `.env`, database files, generated runtime config, browser state, and private
  operator notes out of commits.
- Sign-in is Clerk-only (ADR-0012). Local work uses the development Clerk
  instance; production Clerk keys never belong in a development environment.
- The shared Turso development database is integration infrastructure, not a
  disposable developer database. Do not reset or refresh it casually.
- Redis integration expects Upstash HTTP REST; a native Redis service is not a
  compatible substitute.
- Keep API, DTO, migration, and generated OpenAPI changes coordinated. Add
  migrations rather than editing already-applied migrations, and regenerate
  `docs/api/openapi.json` when the API contract changes.
- Preserve accepted ADR boundaries for identity, authorization, privacy, and
  group membership. Material changes require an ADR update and regression
  coverage.
- Contributor work normally uses a focused branch or worktree and a PR.
  Owner-directed maintenance follows the repository owner's explicit
  instructions. Report administrative bypasses of required checks or review;
  a bypass does not count as passing validation.

## Verification

Use package scripts as the source of truth. Root checks include:

```shell
npm run lint
npm run test:unit
npm run build
npm run test:e2e
npm run verify:migrations
npm run verify:restore
npm run verify:rollback
```

Run the checks relevant to the changed packages and boundaries. Record any
failed or skipped CI check honestly. Do not claim that a bypassed check passed.

## Documentation updates

Update `docs/README.md` when adding or moving maintained documentation. Update
current-state docs when code, configuration, or operations change. Add or
update an ADR for durable architecture, security, data, identity, privacy, or
API compatibility decisions. Keep incomplete work in `docs/work/TODO.md` and
update the standards contract when an assessed gap is resolved or deferred.
