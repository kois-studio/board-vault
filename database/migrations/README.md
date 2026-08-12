# Database migrations

Migrations are numbered, forward-executable SQL changes from the baseline in
[`../schema/schema.sql`](../schema/schema.sql). They are reviewable artifacts,
not an indication that the live Turso database has already been changed.

## Current migration

`0001-add-clerk-user-id.sql` adds a nullable, uniquely indexed `Account.clerkUserId`
column. Nullable values allow the preserved historical accounts to remain
unlinked until their owners sign in through Clerk. The unique index prevents a
Clerk identity from being attached to more than one local account.

The migration is intentionally additive. It does not delete accounts, alter
foreign keys, or remove the legacy password columns. Those changes require a
separate reviewed migration after identity reconciliation and recovery checks.

## Execution rule

There is no migration runner yet. Before applying a migration to Turso:

1. Restore the current backup into a disposable SQLite/libSQL database.
2. Apply the migration and verify schema, row counts, and representative domain
   queries.
3. Record the target database, operator, timestamp, and result in the change
   handoff; do not commit a dump or credentials.

The live deployment must not be edited manually as a substitute for a
versioned migration.
