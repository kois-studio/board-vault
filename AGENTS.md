# Working on Board Vault

Before making changes, read [`README.md`](README.md),
[`CONTRIBUTING.md`](CONTRIBUTING.md), and [`docs/README.md`](docs/README.md).
For product boundaries, read the Board Vault entry in the private Kois context
repository when it is available. The implementation repository is the source
of truth for technical behavior.

## Safe development

- Use `npm run install:all`, `cp backend/.env.example backend/.env`, and
  `npm run local:setup` for routine local development.
- Local setup creates `data/board-vault.local.db` with reserved example.test
  identities. Resetting it is destructive only to that checkout's local data.
- Never use production credentials or data for development or tests. Do not
  display, copy, stage, or commit `.env` files, database files, runtime config,
  browser state, or private operator notes.
- Keep Clerk disabled for normal work. Use development-instance credentials
  only for a task that needs Clerk integration. The shared Turso development
  database is not a scratch database and must not be reset casually.
- The application supports local SQLite through libSQL. Redis uses Upstash's
  HTTP REST API; a native Redis server is not a compatible substitute.

## Parallel work

- Work in a focused feature branch or separate Git worktree and open a PR to
  `main`; do not push task changes directly to `main`.
- Keep local configuration and database state inside the worktree that owns
  them. Coordinate overlapping API, DTO, migration, and OpenAPI snapshot edits
  with other contributors.
- Assign migration sequence numbers at integration time and keep migrations
  additive. Regenerate `docs/api/openapi.json` from backend source after route
  or DTO changes.
- Do not broaden product scope, privacy boundaries, or authorization rules
  without updating the relevant ADR and regression coverage.

## Checks

Use the commands in package manifests. At the repository root, the common
checks are:

```shell
npm run lint
npm run test:unit
npm run build
npm run test:e2e
npm run verify:migrations
npm run verify:restore
npm run verify:rollback
```

Run checks relevant to the changed packages and database contract. GitHub
requires all four CI jobs and one approval before merging to `main`.
