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

These procedures need to be replaced or supplemented by versioned migrations, scheduled backups, restore tests, ownership, and rollback documentation before launch.

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
