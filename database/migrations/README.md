# Database migrations

Migrations are numbered, forward-executable SQL changes from the baseline in
[`../schema/schema.sql`](../schema/schema.sql). Their application status is
recorded in this README and the project handoff documentation.

## Current migration

`0001-add-clerk-user-id.sql` adds a nullable, uniquely indexed `Account.clerkUserId`
column. Nullable values allow the preserved historical accounts to remain
unlinked until their owners sign in through Clerk. The unique index prevents a
Clerk identity from being attached to more than one local account.

The migration is intentionally additive. It does not delete accounts, alter
foreign keys, or remove the legacy password columns. Those changes require a
separate reviewed migration after identity reconciliation and recovery checks.

It was applied to live `board-vault` on 2026-08-12. Post-migration checks
reported integrity `ok`, 15 accounts, 13 meets, 101 meet/game links, and one
linked Clerk account.

## Execution rule

There is no migration runner yet. Before applying a future migration to Turso:

1. Restore the current backup into a disposable SQLite/libSQL database.
2. Apply the migration and verify schema, row counts, and representative domain
   queries.
3. Record the target database, operator, timestamp, and result in the change
   handoff; do not commit a dump or credentials.

The live deployment must not be edited manually as a substitute for a
versioned migration.

## Applied migration 0002

`0002-add-auth-token-expiry.sql` adds nullable `INTEGER` columns
`Account.verification_token_expires_at` and
`Account.password_reset_token_expires_at`. Values are UTC epoch seconds. The
updated backend rejects tokens when the expiry is NULL, in the past, or when a
previous request has already cleared the token. Migration 0002 was applied to
live `board-vault` on 2026-08-16 after a fresh local dump. Live integrity and
foreign-key checks passed, both columns were present, and no existing
verification or password-reset rows had an expiry-bearing token at verification
time. `database/schema/schema.sql` was re-exported after rollout.

## Applied migration 0003

`0003-add-session-relations.sql` adds `MeetAttendee` for participant RSVP and
attendance state and `MeetGame` for planned/played/skipped session-game state.
It backfills selected participants and played games from distinct historical
`MeetAccountGame` pairs without deleting or rewriting those play links.

Migration 0003 was applied to live `board-vault` on 2026-08-16 after a fresh
local dump. It produced 63 attendee rows and 22 session-game rows from 101
source play links; integrity and foreign-key checks passed.
