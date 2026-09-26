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

The last documented live release was migration `0009`. The participant slice
adds migrations `0010`–`0014`; local empty-state and synthetic restore checks
apply the complete chain to `0014`, but no live deployment is claimed until a
fresh authorized backup, representative-data rehearsal, schema probe, and
rollback window are recorded.

## Execution rule

Use `node database/scripts/migrate.mjs` to apply future migrations. The runner
creates `SchemaMigrations`, refuses to run against an empty tracking table
without an explicit baseline, applies each pending SQL file in a transaction,
and records the version only after the SQL succeeds.

For the current synchronized snapshot, initialize a fresh environment with:

```shell
MIGRATION_BASELINE=0005 node database/scripts/migrate.mjs
```

The runner does not replay `0001`–`0005`, because those changes are already part
of the committed current snapshot. To verify that empty-state path locally:

```shell
node database/scripts/verify-empty-state.mjs
```

Before applying a future migration to Turso:

1. Take a fresh backup and restore it into a disposable SQLite/libSQL database.
2. Apply the migration and verify schema, row counts, and representative domain
   queries.
3. Run the migration runner against the authorized target and record the
   target database, operator, timestamp, and result in the change
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

## Migration 0005

`0005-add-recommendation-feedback.sql` adds `RecommendationFeedback` for the
small first feedback loop. It stores the authenticated account, group, game,
selected attendee IDs as JSON text, and one of `interested`, `not_for_us`, or
`played`. It is additive and contains no authentication secrets. Apply it only
after disposable SQLite verification and a fresh live backup; record the live
verification in the operations handoff.

## Migration 0006 (applied 2026-09-08)

`0006-add-group-game-interest.sql` adds `GroupGameInterest`, an additive
group-scoped relation that stores one explicit acquisition-interest signal per
member and catalog game. It deliberately does not reuse `WishlistedGame`,
because a personal wishlist and a shared group purchase decision have different
visibility and ownership semantics.

It was verified against a disposable production export and applied to live
Turso on 2026-09-08 before the acquisition-board backend release was tested
again. It created the table empty; no existing rows were changed.

## Migration 0007 (applied 2026-09-08)

`0007-add-meet-notes.sql` adds nullable `Meet.notes` for a short group-facing
reason, reminder, or outcome attached to a planned or completed session. It is
additive and safe for existing history. It was applied to live Turso on
2026-09-08 after disposable verification; existing rows received `NULL` notes.

## Migration 0008 (applied 2026-09-08)

`0008-add-invitation-expiry.sql` adds nullable `Invitation.expiresAt` and
backfills existing legacy invitations to expire 30 days after `sentAt`. New
legacy username invitations are written with a 30-day expiry; expired
invitations are excluded from recipient and owner pending lists, and acceptance
is rejected with a request to ask for a new invitation. The nullable shape keeps
the migration compatible with any pre-0008 rows until the backfill completes.
It was applied to live Turso on 2026-09-08 after disposable verification. The
one existing invitation was backfilled to expire 30 days after `sentAt`.

## Migration 0009 (applied 2026-09-08)

`0009-add-group-acquisition-decisions.sql` adds `GroupAcquisitionDecision`, a
group-scoped owner decision for an acquisition candidate. It stores `open`,
`planned`, or `not_now` plus the deciding owner, timestamp, and optional note.
It does not represent a purchase; when any group member owns the game, the
acquisition board hides it from the group because ownership is the terminal
truth. It was applied to live Turso on 2026-09-08 after disposable verification
and created the decision table empty.

## Migrations 0010–0014 (organizer-first group people)

`0010-add-group-people.sql` creates stable group-scoped placeholder/linked
identities, ownership assertions, and explicit preferences, then backfills one
linked row for every existing group membership. Its partial unique index keeps
one linked person per account in a group while allowing duplicate display names.

`0011-add-participant-session-data.sql` adds person attendance and per-game
participation relations, backfills existing account participant links, and adds
participant-scoped recommendation feedback. `0012` binds a private normalized
claim email to a placeholder, `0013` lets legacy invitations target that
placeholder, and `0014` adds a 30-day claim expiry with cleanup when a targeted
legacy invitation is revoked or deleted. Claim data is reviewed transactionally
and rejected selections remain group assertions rather than private imports.

The disposable checks are:

```shell
node database/scripts/verify-empty-state.mjs
node database/scripts/verify-restore-rehearsal.mjs
```

Both checks must pass before applying the chain to a real target. A production
rollout must retain the backup, verify `SchemaMigrations` at `0014`, run
integrity/foreign-key checks, and keep the previous deployment available for
rollback until participant reads and claim invitations are smoke-tested.
