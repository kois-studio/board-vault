# Add a database migration

Read the [deletion rules](../data-model.md#deletion-rules) first.

## Write it

1. Create `database/migrations/NNNN-short-description.sql` with the next
   number. If someone else's migration lands on `main` first, renumber yours
   before merging.
2. Keep it **additive**: new tables, new nullable columns or columns with a
   default, new indexes. Removing a column (`ALTER TABLE … DROP COLUMN`) needs
   a separate, reviewed step once no deployed code reads it.
3. Never rebuild the `Account` table (`CREATE … AS SELECT`, drop, rename):
   dropping it cascades through the whole database.
4. Start the file with a comment saying why the change exists and how to roll
   it back.
5. Bump `CURRENT_SCHEMA_VERSION` in
   `backend/src/modules/common/database/database.service.ts`. The readiness
   check reports `schema: down` until the database matches.
6. Update `docs/data-model.md`, and the expectations in
   `database/scripts/verify-*.mjs` and `reset-local.mjs` if they check the
   version.

## Verify it locally

```shell
npm run verify:migrations   # empty database → all migrations
npm run verify:restore      # synthetic snapshot → restore → migrate
npm run verify:rollback     # rollback rehearsal
npm run local:reset         # your local database at the new version
```

All of them use temporary SQLite files. None of them touch Turso.

## Production rollout (David only)

Contributors never run migrations against shared or production databases. For
every migration, David:

1. **Backs up** production and proves the backup restores. Backups go to
   `~/Documents/board-vault-backups/`, outside every repository:
   ```shell
   umask 077
   turso db shell board-vault .dump > ~/Documents/board-vault-backups/prod-<date>-before-<NNNN>.sql
   sqlite3 /tmp/restore-check.db < ~/Documents/board-vault-backups/prod-<date>-before-<NNNN>.sql
   sqlite3 /tmp/restore-check.db "pragma integrity_check; select max(version) from SchemaMigrations;"
   rm /tmp/restore-check.db
   ```
2. **Rehearses** on a branch copy, then destroys it:
   ```shell
   turso db create bv-rehearsal-<NNNN> --from-db board-vault
   TURSO_DATABASE_URL="$(turso db show bv-rehearsal-<NNNN> --url)" \
   TURSO_AUTH_TOKEN="$(turso db tokens create bv-rehearsal-<NNNN> --expiration 1d)" \
   node database/scripts/migrate.mjs
   turso db destroy bv-rehearsal-<NNNN> --yes
   ```
   Before destroying it, compare per-table row counts with production (only
   `SchemaMigrations` should change) and run `pragma integrity_check` and
   `pragma foreign_key_check`.
3. **Migrates and deploys**, with a 1-day token (`--expiration 1d`; Turso does
   not accept hours). If the new code reads the new schema, migrate first and
   then deploy. If it works with both schemas, deploy first. Readiness wants
   the exact version, so `/health/ready` reports `schema: down` between the two
   steps. That is expected.
4. Confirms `https://backend.board-vault.com/health/ready` reports `ready`.
5. Applies the same migration to `board-vault-development`, after backing it
   up (`dev-<date>-before-<NNNN>.sql`).

A one-off data change in production (no migration) follows steps 1 and 2 the
same way: back up first, rehearse on a copy, then apply.
