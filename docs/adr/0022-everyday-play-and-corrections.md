# ADR: Everyday play, personal Home preferences and recording corrections

- **Status:** Accepted
- **Date:** 2026-10-17
- **Supersedes:** ADR-0003's one-entry-per-game limitation; ADR-0019's completed-session editing restriction

## Context

An established group's observed workflow is weekly, often spontaneous play,
with someone recording the afternoon afterward. Purchases and membership
changes are less frequent. This is evidence from one group, not a universal
usage distribution. Planning and retrospective recording are both core paths.
The owner authorized the implementation in #165; fully customizable Home is
explicitly deferred to the discovery in #164.

## Decision

Home always exposes Record and Plan. Every group has the same useful card,
including scoped actions. Personal pins, their order, the unpinned sort
(recently played, next night, name), and dismissed personal rating reminders
live in `AccountHomePreference`, accessed only as the authenticated account.
No device storage or analytics is used for these preferences. Group activity
does not reorder pins; recent play means the date played, not the date entered.
Leaving groups filters their pins out; account deletion removes preferences.

Actual play does not require ownership. The catalogue is the identity source
for a recorded game; ownership can be entered separately afterward. Existing
planning/shortlist ownership rules remain unchanged.

`MeetPlay` records separate plays in their entered order, each with validated
account/group-person ids and optional individual winners and integer scores.
Its JSON contains ids and fixed results, never names or free text. Existing
attendance, game-participation and result relations are compatibility
projections: participants and winners are unions; scores are projected only
for a single play. Group standings count individual plays and wins; history
and recommendation memory continue to group games by session. Existing
sessions without detailed plays are read as one play per recorded game;
there is no data backfill or change to existing history.

Older recordings can contain both account and group-person participation.
Correction and individual results preserve both source identities, including
separate results for an account and its linked person. The UI labels such
separate entries rather than silently merging scores or dropping a player.
Mixed recordings use the full correction form instead of legacy per-game
participation controls.

The group's owner, organizer, or invited non-declined player can correct an
active or completed session's recording. Changing active invitations remains
an organizer action. A correction cannot move a session between groups,
change its lifecycle status or rewrite its history entries. Former people
already recorded may be retained; newly selected people must be active in
the same group. A correction writes the session, participation, individual
plays, results, and an append-only group-history entry in one transaction.

A monotonically increasing recording revision changes on relevant session,
attendance, game and result writes. Corrections and per-play result writes
compare the revision inside the write transaction and refuse stale forms with
409. Any group member may record individual results, as before. Legacy
per-game editors refuse repeated games rather than silently flattening them.

Ratings remain personal game ratings, reused across sessions. Follow-up is
optional, limited to games the account actually played and has not rated,
with at most three dismissible suggestions on Home. Ownership entry names
the target: the caller's own shelf, or a group person without an account.

Starting spontaneous play creates an active session atomically using the
server's current time. Recording a past night does not require planning or
starting it first. Same-day session suggestions are non-blocking, because
several gatherings on the same day can be legitimate.

## Amendment (2026-10-18)

Review of the first release (#166) narrowed the Home presentation. One group
keeps its full card; several groups use compact rows. Scoped Record/Plan
buttons inside each group were removed: the header actions are enough. Pins
are a small corner toggle and order pinned groups by when they were pinned;
the unpinned sort and the pin up/down controls were removed, so the stored
`groupOrder` preference is no longer read by the interface. Rating
follow-ups moved under each Recently played night, at most two per night.

Corrections no longer turn a removed game into "skipped" unless the game had
planning data (votes or a bringer); otherwise its row is removed. On a
completed night, people taken out of a correction are kept as absent rather
than having their invitation deleted, so history keeps who was invited.

## Amendment (2026-10-26)

Several groups no longer use compact rows: each group shows the same full
card as a single group (people, invite nudge, What to play, Library and
History), stacked in the same order, with the last or next night as a chip
under the name and the pin on the card's corner. The shortcuts are what
people open most, and they were one tap away only for people with one group.
Home grows longer with each group; pins keep the ones that matter on top.

## Consequences

Migration 0025 is additive. Old application versions can ignore the new
tables and column; release rollback does not require destructive schema
changes. Names and account-deletion standing remain resolved from existing
identities. `MeetPersonGame` retains the RESTRICT protection for group people;
group/session deletion cascades detailed plays. This intentionally retains
the existing session summaries and API compatibility alongside richer play
details, with authorization and concurrency checked server-side.
