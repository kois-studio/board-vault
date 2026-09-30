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

Contributors never run migrations against shared or production databases.
David follows the private operations runbook:

1. back up production and restore the backup into a disposable copy;
2. apply the migration to the copy and compare integrity, foreign keys, and row
   counts;
3. deploy code that works with both the old and new schema, then migrate;
4. confirm `https://backend.board-vault.com/health/ready` reports `ready`.
