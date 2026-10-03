# Data model

Board Vault separates **accounts** (people who sign in, with private
collections) from **groups** (shared decisions, sessions, and group-scoped
people). A group person can represent someone without an account and can later
be claimed by an account without rewriting group history
([ADR-0010](adr/0010-group-person-identities.md)).

The database is SQLite through libSQL: a local file in development, Turso in
production. The schema is
[`database/schema/schema.sql`](../database/schema/schema.sql) (the 0001–0005
baseline) plus the numbered files in
[`database/migrations/`](../database/migrations/). Current version: **0017**.
All SQL lives in the per-domain query classes in
[`database/queries/`](../backend/src/modules/common/database/queries/).

## Deletion rules

Almost every table has `ON DELETE CASCADE` to `Account`, `UserGroup`, `Game`,
or `Meet`. Deleting one `Account` row silently deletes that person's
collection, reviews, memberships, groups they created (and everything in them),
sessions they created, and more.

- **Never `DELETE FROM Account` and never drop or rebuild the `Account` table.**
  Accounts are soft-deleted with `isDeleted = 1`, including when their Clerk
  user is deleted ([ADR-0013](adr/0013-clerk-user-lifecycle.md)). A unit test
  ([`account-invariants.spec.ts`](../backend/src/modules/common/database/account-invariants.spec.ts))
  fails if either statement appears in the backend.
- Column removal uses `ALTER TABLE … DROP COLUMN`, which does not fire cascades.
- `MeetPersonAttendee`, `MeetPersonGame`, and `MeetGameResult` use `RESTRICT`
  on `GroupPerson`: a group person with session history cannot be deleted.

## Tables

| Table | What it holds | References (on delete) |
| --- | --- | --- |
| `Account` | A person who signs in: `email`, `username`, `displayName`, `avatar`, `isAdmin`, `isDeleted`, and `clerkUserId` (unique). No credentials (ADR-0012). | — |
| `Game` | Catalogue game: image, duration, player counts. | — |
| `GameTranslation` | Title per language (`en`, `es`) and a normalized title for search. | `Game` (cascade) |
| `TagCategory`, `Tag`, `GameTag` | Catalogue tagging. | `TagCategory` → `Tag` (cascade); `Game`, `Tag` (cascade) |
| `GameProposal` | A user's request to add a game; admins approve, reject, or mark as duplicate. `addTo` (`shelf`, `wishlist`, or NULL) is where the approved game goes for the proposer, added in the approval transaction. | submitter `Account` (cascade); reviewer `Account`, created `Game` (set null) |
| `OwnedGame` | Private shelf: owned game, price, purchase date. | `Account`, `Game` (cascade) |
| `WishlistedGame` | Private wishlist with priority. | `Account`, `Game` (cascade) |
| `GameReview` | A user's rating and review. | `Account`, `Game` (cascade) |
| `CollectionActivity` | Last 32 shelf, wishlist, and review actions per account. | `Account`, `Game` (cascade) |
| `UserGroup` | A group. | creator `Account` (cascade) |
| `GroupMembership` | Account membership in a group. | `UserGroup`, `Account` (cascade) |
| `Invitation` | Invitation of an existing account to a group, optionally to claim a group person; has an expiry. | `UserGroup`, both `Account`s (cascade); `GroupPerson` (set null) |
| `Notification` | In-app notification. | `Account` (cascade) |
| `GroupPerson` | A group-scoped participant, optionally linked to an account; carries the claim email and expiry. | `UserGroup`, creator `Account` (cascade); linked `Account` (set null) |
| `GroupPersonGameOwnership`, `GroupPersonGamePreference` | Games a group person owns or likes, entered by a member. | `GroupPerson`, `Game`, entering `Account` (cascade); confirming `Account` (set null) |
| `GroupGameInterest` | A member's interest in a game for the group. | `UserGroup`, `Account`, `Game` (cascade) |
| `GroupAcquisitionDecision` | The group's acquisition decision for a game: `open`, `planned`, or `not_now`, with an optional note. | `UserGroup`, `Game`, deciding `Account` (cascade) |
| `Meet` | A session (named `Meet` for historical reasons): date, status, timezone, notes. | `UserGroup`, creator `Account` (cascade) |
| `MeetAttendee`, `MeetPersonAttendee` | Account and group-person attendance, RSVP. | `Meet` (cascade); `Account` (cascade) / `GroupPerson` (restrict) |
| `MeetGame`, `MeetAccountGame`, `MeetPersonGame` | Shortlisted and played games, and who played them. | `Meet`, `Game` (cascade); `Account` (cascade) / `GroupPerson` (restrict) |
| `MeetGameResult` | Who won a played game (`isWinner`) and an optional integer `score`, one row per participant with a result. A row names an account or a group person, never both (CHECK). Rows for someone no longer recorded as playing that game are deleted when played games change. Ties and co-op wins are several winner rows; nobody winning is no rows. | `Meet`, `Game`, `Account` (cascade) / `GroupPerson` (restrict) |
| `RecommendationFeedback`, `RecommendationFeedbackParticipant` | Feedback on recommendations, per account or participant set. | `UserGroup`, `Account`, `Game` (cascade) |
| `FeatureFlags` | Runtime feature switches. | — |
| `SchemaMigrations` | Applied migration versions. The API's readiness check compares the latest one with the version it expects. | — |

## Persistence rules

- Private account data never appears in group-member projections
  ([ADR-0006](adr/0006-user-response-privacy.md)).
- Group reads are membership-scoped. Group-person claims are bound to the
  invited email and group on the server.
- Read `Account` rows through the explicit `ACCOUNT_COLUMNS` list in
  `database.constants.ts` and by column name, never `SELECT *` or by position; its
  column order changed when 0015 dropped columns. Prefer the same for new
  queries on other tables.
- Multi-record writes define transaction, duplicate, and partial-failure
  behavior.
- Fixtures and verification databases use synthetic data only.

To change the schema, follow [how-to/add-migration.md](how-to/add-migration.md).

## Cache (Redis)

Turso is the only source of truth. Upstash Redis holds disposable copies of
read results and the rate-limit counters, through
[`CacheService`](../backend/src/modules/common/cache/cache.service.ts).

- **Keys:** `<area>:<selector>:<id>`, for example `reviews:byAccountId:7` or
  `game-proposal:byStatus:pending`. Rate limits use `rate-limit:…` keys that
  expire with their window.
- **Values:** JSON, serialized by the Upstash client.
- **TTL:** every entry expires: `short` 1 hour (collections, reviews,
  wishlist), `medium` 6 hours, `long` 1 day (translations). See
  [`cache.types.ts`](../backend/src/modules/common/cache/cache.types.ts).
- **Invalidation:** a write deletes the keys it makes stale in the same
  service method. A missed invalidation is bounded by the TTL, which is the
  accepted staleness.
- **Failure:** each Redis call times out after 250 ms and never retries. A
  failure counts as a cache miss and pauses Redis use for 30 seconds; rate
  limits then fail open. `/health/ready` reports `not_ready` while Redis is
  down, but the API keeps serving from Turso.
- **Concurrency:** there is no stampede protection; at private-beta traffic a
  concurrent miss costs one extra query.
- Clearing the cache is always safe (admin cache endpoints, or `FLUSHDB` on a
  local Redis).
