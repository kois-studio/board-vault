# Database operations notes

These are generic, manual examples for disposable or explicitly authorized
recovery targets. They are not a backup schedule or a complete recovery
runbook. Confirm the target, ownership, authorization, and rollback plan before
running any command.

## Create a dump

```sh
turso db list
turso db shell <database-name> .dump > "$TMPDIR/board-vault-dump.sql"
```

Treat dumps as sensitive data. Keep them outside the repository and remove
temporary copies after the documented retention period.

## Empty a disposable database

This is destructive and must not be used for feature development against a
shared or production target. Prefer a fresh disposable database or the
versioned migration runner.

```sh
turso db shell <database-name> \
  "SELECT 'DROP TABLE ' || name || ';' FROM sqlite_master WHERE type = 'table';" \
  > "$TMPDIR/drop_tables.sql"
turso db shell <database-name> < "$TMPDIR/drop_tables.sql"
```

## Restore a dump

Restore only into an explicitly identified disposable or approved recovery
target after validating the source and ownership.

```sh
turso db shell <database-name> < "$TMPDIR/board-vault-dump.sql"
```

The repository’s safe local check is `npm run verify:restore`. It creates a
synthetic SQLite snapshot, copies it, applies the migration chain, verifies
representative rows and integrity, and removes the temporary files. It does
not prove that a hosted-provider backup can be restored.

## Migration and authentication boundaries

Use `database/scripts/migrate.mjs` for numbered migrations and
`database/scripts/verify-empty-state.mjs` for clean-schema verification. A
fresh snapshot must use the documented migration baseline; do not apply the
schema export directly to another environment without review.

The backend reads `CLERK_SECRET_KEY` and
`CLERK_AUTHORIZED_PARTIES`; browser code may contain only the public Clerk
publishable key. Keep provider configuration, live migration markers, backup
locations, and recovery ownership in private operator documentation.

## Rules

- Never commit credentials, hosted-provider dumps, or personal data.
- Every migration must be numbered, forward-executable, and tested from an
  empty database and a representative synthetic database.
- Keep fixtures synthetic and reviewable.
- Do not use production data to make a local test pass.
- Record provider-specific rollout and recovery decisions privately.
