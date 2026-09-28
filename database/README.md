# Database workspace

This directory contains the Board Vault schema, numbered migrations, and
disposable local verification scripts.

## Layout

- `schema/schema.sql` — the reviewed schema baseline;
- `migrations/` — additive, numbered SQL changes;
- `scripts/` — migration and local verification tooling.

The schema snapshot is a reference artifact, not a replacement for a reviewed
migration. Do not edit a shared database manually to make application code
pass. Test migrations against disposable SQLite/libSQL data before applying
them to any shared environment, and retain a recoverable backup privately.

## Local verification

For a ready-to-use per-checkout SQLite database with synthetic application
fixtures, run `npm run local:setup` from the repository root. It creates only
`data/board-vault.local.db`; rerun it to discard and recreate that local state.
This command never reads developer environment variables for its target and
cannot connect to Turso.

The migration runner reads `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` from the
environment. For a fresh copy of the current snapshot, use the documented
baseline before applying pending migrations:

```shell
MIGRATION_BASELINE=0005 node scripts/migrate.mjs
node scripts/verify-empty-state.mjs
node scripts/verify-restore-rehearsal.mjs
```

Use only disposable local databases for fixtures and rehearsals. Fixture
scripts must use synthetic identities and must reject production targets.

See [`../docs/data-model.md`](../docs/data-model.md), the migration README, and
the API contract for the boundaries that affect persistence.
