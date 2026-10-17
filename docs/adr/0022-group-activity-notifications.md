# ADR: Notifications about shelves and members, without flooding an inbox

- **Status:** Accepted
- **Date:** 2026-10-17
- **Supersedes:** None
- **Superseded by:** None

## Context

A group wants to hear when one of its people adds a game to their shelf or
removes one ("Ana added Catan to their shelf."), and when someone joins or
leaves. Shelf changes are made by one person alone, as often as they like. A
plain "one notification per change" design lets anyone fill everyone's inbox
by adding and removing the same game over and over, and an inbox only shows
the latest 100 notifications, so a flood also pushes out the ones that matter.
A rate limit alone does not fix it: any limit high enough for someone entering
their whole collection in one sitting is still a flood.

The backend runs on Vercel without background jobs, so a digest sent later
by a scheduler is not available.

## Decision

### Shelf changes: one notification per person, kept up to date

- Everyone who shares at least one group with the person hears it, once,
  however many groups they share. The person never hears their own change.
- A reader has at most one **unread** `shelf_changed` notification per person
  whose shelf changed. A new change joins it instead of adding another: its
  text is written again and its date moves to now, so it rises to the top.
- It keeps only the **net** result since the reader last read it (`data.added`,
  `data.removed`). A game added and then removed again, or removed and then
  added back, drops out. When nothing is left, the notification is deleted.
- Once the reader has read it, the next change starts a new one, and the read
  one stays as it was.
- The lookup and the write happen in one write transaction, so two changes at
  the same moment never write two notifications.
- Every way a game goes onto or off someone's shelf notifies: adding and
  removing one, `PUT /users/:userId/games` (only the games that really
  changed), an approved proposal that puts the game on the proposer's shelf,
  and claiming a group person while bringing their games to one's own shelf
  (only the games that were not there yet).
- `data.group` is the first group the two share, where the reader can see the
  person's games. When the person leaves that group, what others were told
  about their shelf there is deleted with the rest (ADR-0018).
- As a safety net, `POST` and `DELETE /collection/users/:userId/games/:gameId`
  share a budget of 300 changes an hour per account, and
  `PUT /users/:userId/games` allows 30 calls an hour.

### Joining and leaving cancel out while unread

- Leaving a group (`user_left_group`) tells the members still in it, except
  whoever acted. When the owner removes someone, it says who removed whom, and
  `data.account` is the owner while `data.member` is the person removed.
- A leave deletes the reader's unread "joined" notification about the same
  person and group instead of adding "left". Joining again deletes an unread
  "left" one in the same way. A reader who had not read either hears neither,
  which is where they already were.

### The type that was never written

`games_added` was declared but nothing wrote it. `shelf_changed` replaces it.

## Consequences

- An inbox holds at most one unread notification per person whose shelf
  changed, whatever that person does. Readers decide when a new one starts, by
  reading.
- The rule needs no migration. Each change reads the reader's unread
  `shelf_changed` rows through `json_extract` on `data`, which is fine at the
  current size. A `groupKey` column with a unique index on
  `(accountId, groupKey)` would let the database enforce the rule and index the
  lookup; that is an owner decision for a later migration.
- The text is written by the API in English, as for every other notification.
  `data` holds identifiers, so the app could write it itself later.
- Rate limits fail open without Redis, as everywhere else. The one-per-reader
  rule does not depend on Redis.
- The net result does not depend on the order changes arrive in, so two
  requests racing each other still end right.
- `data.added` and `data.removed` can only hold games that really changed
  since the reader last read, so they are bounded by the catalogue; nothing
  trims them.
- Accepted: a reader who marks a notification read just as a change updates
  it reads the change in the same click. A reader who stops sharing every group
  with the person keeps an unread one that nothing updates any more.

## Evidence

- [Net result and message](../../backend/src/modules/core/notifications/shelf-notification.ts)
- [The transaction](../../backend/src/modules/common/database/queries/notifications.queries.ts)
- [Through the API on a real database](../../backend/test/group-activity-notifications.e2e-spec.ts)
