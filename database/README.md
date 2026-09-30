# Database

- `schema/schema.sql`: the reviewed 0001–0005 baseline.
- `migrations/`: numbered, additive SQL changes applied on top of it.
- `scripts/`: the migration runner (`migrate.mjs`), the local reset, fixture
  seeds, and the disposable verification scripts behind `npm run verify:*`.

Tables and deletion rules: [`../docs/data-model.md`](../docs/data-model.md).
How to add a migration: [`../docs/how-to/add-migration.md`](../docs/how-to/add-migration.md).

`npm run local:setup` can only touch `data/board-vault.local.db`, and the
`verify:*` scripts use temporary SQLite files. `migrate.mjs` has no guard: it
migrates whatever `TURSO_DATABASE_URL` points to, so run it yourself only
against a local file. Shared and production databases are migrated by David.
