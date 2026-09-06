# Database operations notes

These are manual Turso CLI notes retained from the former backend documentation. They are not a backup schedule or complete recovery runbook; use the committed migration runner for schema changes. Confirm the target database and obtain explicit authorization before running destructive commands.

Reference: [Turso database shell documentation](https://docs.turso.tech/cli/db/shell)

## Create a dump

```shell
turso db list # identify the <database-name>
turso db shell <database-name> .dump > dump.sql
```

Treat dumps as sensitive data. Do not commit them or place them in fixtures.

## Empty a database

This is destructive and should not be used for feature development or production recovery. Prefer a migration or a new disposable database.

```shell
turso db shell <database-name> "SELECT 'DROP TABLE ' || name || ';' FROM sqlite_master WHERE type = 'table';" > drop_tables.sql
turso db shell <database-name> < drop_tables.sql
```

## Restore a dump

Only restore into an explicitly identified disposable or recovery target after validating the dump source and ownership.

```shell
turso db shell <database-name> < dump.sql
```

These procedures need to be supplemented by a real scheduled-backup owner, recovery target, rollback procedure, and provider-level restore rehearsal before launch. The repository’s safe local check is `npm run verify:restore`; it creates a temporary synthetic SQLite snapshot, copies it, applies pending migrations, verifies representative social/session data, and deletes the temporary files. It does not prove that a Turso backup can be restored.

On 2026-09-06, a read-only `turso db export board-vault --output-file <temporary-path> --with-metadata` export was verified locally with `PRAGMA integrity_check = ok` and no foreign-key violations. Pending migrations 0006–0009 were then applied to that disposable copy and preserved the live counts observed at export time. A separate read-only `turso db shell board-vault` check confirmed live markers through `0005`, 16 accounts, 5 groups, 13 sessions, and 22 session/game links. `turso db show board-vault` reports one healthy primary instance in `aws-eu-west-1` with delete protection disabled; the CLI output does not establish a scheduled backup policy or recovery owner. These are one-time release facts, not a backup schedule; keep exports out of the repository and do not apply migrations to live Turso without an approved rollout and rollback window.

## Clerk migration configuration

The backend Clerk boundary reads `CLERK_SECRET_KEY`. Before production
cutover, also set `CLERK_AUTHORIZED_PARTIES` to the exact frontend origins that
may issue sessions, separated by commas. The frontend uses only the Clerk
publishable key through its environment configuration; never place
`CLERK_SECRET_KEY` in Angular environment files or browser code.

The current implementation keeps `/auth/status` and the legacy JWT path in
place for the recovery window. `/auth/clerk/status` is the explicit
identity-link surface, while protected API routes also accept verified Clerk
sessions through the backend middleware. Production deployment, recovery
verification, and legacy-auth removal remain outstanding.
