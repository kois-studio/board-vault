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
[`database/migrations/`](../database/migrations/). Current version: **0027**.
All SQL lives in the per-domain query classes in
[`database/queries/`](../backend/src/modules/common/database/queries/).

## Deletion rules

Almost every table has `ON DELETE CASCADE` to `Account`, `UserGroup`, `Game`,
or `Meet`. Deleting one `Account` row silently deletes that person's
collection, reviews, memberships, groups they created (and everything in them),
sessions they created, and more.

- **Never `DELETE FROM Account` and never drop or rebuild the `Account` table.**
  Deleting an account keeps the row with `isDeleted = 1` and nothing personal
  on it, removes the person's private data explicitly, and keeps their group
  people in history as "Deleted account"
  ([ADR-0018](adr/0018-account-deletion-and-leaving-groups.md),
  `account-deletion.queries.ts`). A unit test
  ([`account-invariants.spec.ts`](../backend/src/modules/common/database/account-invariants.spec.ts))
  fails if either statement appears in the backend.
- Column removal uses `ALTER TABLE … DROP COLUMN`, which does not fire cascades.
- `MeetPersonAttendee`, `MeetPersonGame`, and `MeetGameResult` use `RESTRICT`
  on `GroupPerson`: a group person with session history cannot be deleted.
  Deleting a group therefore deletes its session rows first
  (`group-lifecycle.ts`).
- A group person's **standing** (`member`, `left`, `deleted`) is not stored:
  group-person reads derive it from the account and the membership (ADR-0018).
  Leaving a group deletes only the membership and the person's place in
  scheduled sessions; completed sessions never change.
- **`GroupActivity` is append-only** ([ADR-0020](adr/0020-group-history.md)).
  Two triggers refuse any `UPDATE`, and any `DELETE` while its group exists;
  deleting the group removes its history (cascade, plus an explicit delete in
  `group-lifecycle.ts` after the group row). Its references to sessions,
  people, games and accounts have no foreign keys on purpose, and it never
  holds names or free text, so account deletion needs no extra step.
  [`group-activity-invariants.spec.ts`](../backend/src/modules/common/database/group-activity-invariants.spec.ts)
  fails if application code updates or deletes it anywhere else.

## Tables

| Table | What it holds | References (on delete) |
| --- | --- | --- |
| `Account` | A person who signs in: `email`, `username`, `displayName`, `avatar`, `isAdmin`, `isDeleted`, `clerkUserId` (unique), and `locale`, the interface language they chose or signed up in (NULL until then; the API validates it, ADR-0024). No credentials (ADR-0012). `email` and `username` are copies of Clerk's, kept in step by webhook and `POST /auth/sync-from-clerk`; usernames match case-insensitively (ADR-0017). | — |
| `Game` | Catalogue game: artwork address, duration, player counts. `imageUrl` is `/artwork/<id>-<hash>.webp` for stored artwork, or empty for none. `retailPriceCents` is the recommended retail price in euro cents (NULL when unknown); collection-worth estimates read it, never `OwnedGame.purchasePrice` (ADR-0016). | — |
| `GameArtwork` | Board Vault's copy of a game's artwork (ADR-0015): compressed WebP bytes, size, the hash in its address, and the address it was copied from (NULL for an upload). | `Game` (cascade) |
| `GameTranslation` | Title per language (`en`, `es`) and a normalized title for search. | `Game` (cascade) |
| `TagCategory`, `Tag`, `GameTag` | Catalogue tagging. | `TagCategory` → `Tag` (cascade); `Game`, `Tag` (cascade) |
| `TagTranslation`, `TagCategoryTranslation` | A tag's or category's name in another interface language (`es`, `fr`, `de`, `it`; ADR-0024). English stays in `name`; a language without a row shows the English. | `Tag`, `TagCategory` (cascade) |
| `GameProposal` | A user's request to add a game; admins approve, reject, or mark as duplicate. Approval creates the game with exactly the reviewed values: players and length must come from the proposal or the admin, never a default. A rejection's `reviewNotes` is the reason the proposer reads; a duplicate names the existing game in the proposer's notification (`duplicateOfGameId` in its data). `addTo` (`shelf`, `wishlist`, or NULL) is where the approved game goes for the proposer, added in the approval transaction. | submitter `Account` (cascade); reviewer `Account`, created `Game` (set null) |
| `OwnedGame` | Private shelf: owned game, price, purchase date. | `Account`, `Game` (cascade) |
| `WishlistedGame` | Private wishlist with priority. | `Account`, `Game` (cascade) |
| `GameReview` | A user's rating and review. | `Account`, `Game` (cascade) |
| `CollectionActivity` | Last 32 shelf, wishlist, and review actions per account. | `Account`, `Game` (cascade) |
| `UsageEvent` | Usage analytics (ADR-0021): `name` from a fixed list, `pseudonym` (HMAC of the account id with `USAGE_PSEUDONYM_SECRET`), `view` and `fromView` (route templates). No account id, ids, free text or IP. Deleted after 30 days by the daily job; deleted for an account when it opts out or is deleted. | — (no foreign keys: it holds no account id) |
| `UsageDaily` | Anonymous daily counts per event name and screen (`events`, distinct `people`), made from finished days of `UsageEvent` and kept. | — |
| `UsageOptOut` | Accounts that turned usage statistics off in Settings → Privacy. | `Account` (cascade) |
| `UsageNotice` | Accounts that answered the one-time notice about usage statistics (the card in the app, the invitation sign-up switch or Settings); the others see the card. | `Account` (cascade) |
| `GroupActivity` | The group history (ADR-0020): one row per change that affects others in a group. `actorAccountId`, `type`, references (`meetId`, `groupPersonId`, `gameId`, `subjectAccountId`) and `data`, a JSON of ids and fixed values. Written in the same transaction as the change; names are looked up when read (`GET /groups/:groupId/activity`, members only). | `UserGroup`, actor `Account` (cascade); the references have no foreign keys |
| `UserGroup` | A group. | creator `Account` (cascade) |
| `GroupMembership` | Account membership in a group. | `UserGroup`, `Account` (cascade) |
| `Invitation` | Invitation of an existing account to a group, optionally to claim a group person; has an expiry. | `UserGroup`, both `Account`s (cascade); `GroupPerson` (set null) |
| `Notification` | In-app notification. `type` says what happened: game proposals (`game_proposal_*`, from admin review), game nights (`meeting_scheduled`, `session_started`, `session_finished`, `session_cancelled`; `data` has `account`, `meeting`, `group`) someone joining or leaving (`user_joined_group`; `data` has `account`, `group`; `user_left_group`, `data` also has `member`, who left, while `account` is whoever acted), someone's shelf changing (`shelf_changed`; `data` has `account`, `group`, a group the reader shares with them, and the net `added` and `removed` game ids: one unread notification per person whose shelf changed, kept up to date, ADR-0023), and someone changing a group person's game or preference that another member entered (`group_person_changed`, sent to that member; `data` has `account`, `group`, `person`, `game`). `ActivityNotifier` writes the game-night, joining, leaving, shelf and group-person ones after the change is saved, to everyone concerned except the person who acted; a failure is logged and never fails the change. Only the API writes them (there is no route to create one). `message` is the English sentence, kept for older clients and older rows; the app words each type itself from `type`, `data`, and the `context` the inbox read sends with it (current names, a deleted account as one, the game night's date and time zone, game titles in the reader's language; ADR-0024). `group_person_changed` data also holds `change` (`owned`, `not_owned`, `unsure`, `preference`, `preference_removed`) and a duplicate proposal's data its `reviewNotes`. An inbox answers the latest 100, newest first. Leaving a group drops the leaver's notifications about it and what others were told about the leaver's shelf there, deleting a group drops everyone's, and deleting an account renames it to "Deleted account" in what others were told about it (ADR-0018). | `Account` (cascade) |
| `GroupPerson` | A group-scoped participant, optionally linked to an account; carries the claim email and expiry. | `UserGroup`, creator `Account` (cascade); linked `Account` (set null) |
| `GroupPersonGameOwnership`, `GroupPersonGamePreference` | Games a group person owns or likes, entered by any member (ADR-0020); `enteredByAccountId` is whoever set it last, and the group history keeps every earlier change. | `GroupPerson`, `Game`, entering `Account` (cascade); confirming `Account` (set null) |
| `GroupGameInterest` | A member's interest in a game for the group. | `UserGroup`, `Account`, `Game` (cascade) |
| `GroupAcquisitionDecision` | The group's acquisition decision for a game: `open`, `planned`, or `not_now`, with an optional note. | `UserGroup`, `Game`, deciding `Account` (cascade) |
| `AccountHomePreference` | Per-account pins, pin order, group sort and dismissed rating reminders as validated JSON; removed on account deletion. | `Account` (cascade) |
| `MeetPlay` | Individual plays by session and position, with catalogue game id and JSON containing validated participant ids and optional winners/scores; no names or free text. Existing session relations hold compatibility projections. Legacy sessions derive one play per game. See ADR-0022. | `Meet`, `Game` (cascade) |
| `Meet` | A session (named `Meet` for historical reasons): date, status, timezone, notes, and a recording revision incremented by triggers on relevant changes. | `UserGroup`, creator `Account` (cascade) |
| `MeetAttendee`, `MeetPersonAttendee` | Account and group-person attendance, RSVP. | `Meet` (cascade); `Account` (cascade) / `GroupPerson` (restrict) |
| `MeetGame`, `MeetAccountGame`, `MeetPersonGame` | Shortlisted and played games, and who played them. A shortlisted game can name who brings it (#115): `broughtByAccountId` (an account that owns it) or `broughtByPersonId` (a group person the organizer names), cleared when that person declines the night. Replacing the shortlist keeps the rows of games that stay. | `Meet`, `Game` (cascade); `Account` (cascade) / `GroupPerson` (restrict) |
| `MeetGameVote` | One account would play one shortlisted game on that night (#114). The shortlist orders by votes; replacing the shortlist drops the votes of games taken off it. Accounts only: group people without an account do not vote. | `Meet`, `Game`, `Account` (cascade) |
| `MeetGameResult` | Who won a played game (`isWinner`) and an optional integer `score`, one row per participant with a result. A row names an account or a group person, never both (CHECK). Rows for someone no longer recorded as playing that game are deleted when played games change. Ties and co-op wins are several winner rows; nobody winning is no rows. | `Meet`, `Game`, `Account` (cascade) / `GroupPerson` (restrict) |
| `RecommendationFeedback`, `RecommendationFeedbackParticipant` | Feedback on recommendations, per account or participant set. | `UserGroup`, `Account`, `Game` (cascade) |
| `FeatureFlags` | Runtime feature switches. | — |
| `SchemaMigrations` | Applied migration versions. The API's readiness check compares the latest one with the version it expects. | — |

## Persistence rules

- Private account data never appears in group-member projections
  ([ADR-0006](adr/0006-user-response-privacy.md)).
- Group reads are membership-scoped. Group-person claims are bound to the
  invited email and group on the server. A claim lasts 30 days; the daily
  maintenance job clears the email and expiry of any claim past it, so the
  email of someone without an account is kept no longer than the claim.
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
- **TTL:** every entry expires: `minute` 1 minute (the admin overview,
  `admin:overview`), `short` 1 hour (collections, reviews, wishlist),
  `medium` 6 hours, `long` 1 day (translations). See
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
