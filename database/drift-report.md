# Database drift report

This report records the first repository-to-deployment reconciliation for
DATA-001. It is intentionally separate from the schema snapshot: the snapshot
describes what is deployed, while this report describes where current code and
product intent do not agree with it.

## Scope and baseline

- **Baseline:** [`schema/schema.sql`](schema/schema.sql), the owner-supplied
  Turso export verified on 2026-08-12 and re-exported after migration 0002 on
  2026-08-16.
- **Repository audit:** backend and frontend source inspected on 2026-08-16.
- **Live aggregate probe:** read-only Turso CLI queries on 2026-08-16 found 16
  accounts, 5 groups, 13 meets, and 101 `MeetAccountGame` rows. Every meet has
  at least one link; per-meet aggregates contain 2–8 distinct accounts and 1–3
  distinct games. The probe did not expose personal fields and did not mutate
  the database.
- **Live migration probe:** after the 2026-08-16 rollout, `Account` contains
  `clerkUserId`, `verification_token_expires_at`, and
  `password_reset_token_expires_at`. Integrity and foreign-key checks passed;
  migration 0002 is now reflected in the synchronized schema snapshot.
- **Authority:** the deployed schema snapshot is authoritative for current
  tables and columns. Code, old schema notes, route names, and TypeScript types
  are evidence of intended or historical behavior only.
- **Safety:** the report does not authorize schema changes to make stale code
  pass. Migration 0002 is a separately reviewed additive change; do not add a
  table or column for the meeting drift until the canonical session/data
  decision is recorded and a numbered migration is reviewed.

## Findings

| ID | Area | Evidence | State | Priority | Required decision or next action |
|---|---|---|---|---|---|
| DRIFT-001 | Meeting attendees | `schema.sql` defines `Meet` and `MeetAccountGame`, but no `MeetAttendee`. `DatabaseService.getMeetDetailsByIdForAccount()` and `addGroupMembersToMeeting()` still query or insert `MeetAttendee` (`backend/src/modules/common/database/database.service.ts:1017-1048`). A 2025 commit, `ef6e3d2`, removed the old table/module. | `gap` | Critical | Decide whether attendee state is represented by `MeetAccountGame`, a new session-attendance table, or the legacy path is retired. Then remove/replace the stale SQL and add integration coverage. |
| DRIFT-002 | Meeting games | `schema.sql` defines `MeetAccountGame(meetId, accountId, gameId)`, but no `MeetGame`. `getMeetDetailsByIdForAccount()` reads `playedGames` from `MeetGame`, and `addGroupGamesToMeeting()` inserts into it (`database.service.ts:1021-1061`). | `gap` | Critical | Define planned versus played game semantics in DATA-003. Preserve historical `MeetAccountGame` meaning only after confirming it against real data; do not create a compatibility table by assumption. |
| DRIFT-003 | Frontend attendee route | `frontend/src/app/api/api.ts` calls `POST/DELETE /meetAttendees/:meetId/:accountId`; no backend controller currently exposes a `meetAttendees` route. The frontend types and service still call these methods. | `gap` | High | Remove the dead client path or replace it after the canonical session API is designed. Treat current UI methods as stale, not as proof that attendee editing works. |
| DRIFT-004 | Game title storage | The deployed `Game` table has no `title` column. `GamesService.createGame()` accepts a title, but `DatabaseService.createGame()` inserts only the four deployed `Game` columns. Admin proposal approval later writes the title to `GameTranslation`, including a required English fallback. | `partial` | High | Make `GameTranslation` the explicit title source, or approve a separate schema change. Clarify the return contract of generic game creation and test creation before/after translations. |
| DRIFT-005 | Meeting creation completeness | `DatabaseService.createMeeting()` inserts only `groupId` and `createdBy`; it relies on the deployed `Meet.meetDate` default and does not create attendees or game links. The product workstream expects date/time, attendees, and planned games to be persisted. | `partial` | Critical | Define the session aggregate and transaction boundary in DATA-003/DATA-004 before changing this flow. This is an incomplete behavior path, not evidence that the current schema is missing columns. |
| DRIFT-006 | Token-expiry migration | Backend SQL reads and writes `verification_token_expires_at` and `password_reset_token_expires_at`. Migration 0002 is applied to live Turso, the columns are present, integrity/foreign-key checks pass, and `schema.sql` is synchronized. | `compliant` | Critical | Preserve this evidence while adding repeatable migration execution and environment-parity checks; nullable/expired values must continue to fail closed. |

## What is already aligned

- The current export contains the Clerk bridge column and unique index from
  migration `0001-add-clerk-user-id.sql`.
- Active backend meeting-history code uses `MeetAccountGame` for the play
  records exposed through the `meet-account-games` module, dashboard, and play
  feature. That table is real and should not be replaced just because stale
  `MeetGame` names remain elsewhere.
- Game titles are already persisted in `GameTranslation` during the admin
  proposal approval path. The unresolved issue is the generic creation
  contract, not an absent `Game.title` column that can safely be added without
  a design decision.

## Recommended order

1. Record the canonical session model and ownership semantics in DATA-003,
   including whether historical `MeetAccountGame` rows mean played games.
2. Retire or rewrite the stale attendee/game SQL and frontend attendee route;
   add a small integration fixture that proves the selected model against the
   exported schema.
3. Preserve the completed migration 0002 evidence while defining a reviewed,
   repeatable migration procedure and empty-state recreation in DATA-002.
4. Only then implement the larger session and recommendation TODOs.

## Explicit unknowns

- Whether any external consumer still calls the deprecated meeting routes.
- Whether the 101 historical `MeetAccountGame` links represent attendance,
  planned games, played games, or a mixture of those concepts.
- Whether generic game creation is intended to be usable outside proposal
  approval, and which language should be the required canonical title.
- Whether migration 0002 has been promoted to any future environment beyond
  the verified live `board-vault` database; no parity claim is made for an
  environment that has not been checked.
