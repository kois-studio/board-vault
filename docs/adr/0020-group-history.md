# ADR: Group history

- **Status:** Accepted
- **Date:** 2026-10-16
- **Supersedes:** The owner-only rule for a group person's games and preferences in [ADR-0010](0010-group-person-identities.md)
- **Superseded by:** None

## Context

Many people change a group's shared data. Anyone coming to a game night
records what was played, who came and who won (ADR-0019), and a group
person's games are statements the group makes about someone without an
account (ADR-0010). When something changes, nobody can see who changed it
or what it was before. Someone who added a game to a person and later finds
it gone has no way to know what happened.

Shared-ledger apps such as Settle Up answer this with an activity feed that
every member reads. A correction is a new entry, never an edit of an old one,
the way a revert commit keeps the commit it undoes.

This is part of the product, shown to the group. It is not usage analytics,
which is a separate system with its own rules (#152).

## Decision

### What is recorded

`GroupActivity` holds one row per change that affects other people in a
group: who did it (`actorAccountId`), when, what (`type`), and what it was
about, as references only (`meetId`, `groupPersonId`, `gameId`,
`subjectAccountId`). A small JSON `data` holds the rest of the change as
identifiers and fixed values, such as which games joined or left a shortlist,
or a game's previous ownership status.

The types:

| Area | Types |
| --- | --- |
| Game nights | `session_planned`, `session_recorded`, `session_started`, `session_finished`, `session_cancelled`, `session_invites_changed`, `session_shortlist_changed`, `session_bringer_changed`, `session_played_changed`, `session_rsvp`, `session_attendance_changed`, `session_results_changed` |
| Group people | `person_added`, `person_updated`, `person_archived`, `person_restored`, `person_claimed`, `person_game_set`, `person_preference_set`, `person_preference_removed` |
| Membership | `member_joined`, `member_left`, `member_removed` |

Votes are not recorded: a vote is someone's own wish, it changes nothing
anyone else entered, and recording every tap would bury the rest. The
acquisition board and group settings can be added later as new types.

### Append-only

Entries are never changed or deleted by the application. Two triggers in the
database refuse any `UPDATE`, and any `DELETE` while the group still exists.
A spec test checks that no application code outside the group deletion
writes `UPDATE` or `DELETE` against the table. A mistake is fixed by making
the change again, which adds a new entry.

### Written with the change

The entry is written in the same transaction or batch as the change it
describes. If it cannot be written, the change fails too: a history with
gaps cannot be trusted. Where a change takes two steps (accounts and group
people on one night), the entry goes with the last one.

### References, never copies

Entries never copy a name, a note or any other free text. Names are looked
up when the history is read, so the history follows ADR-0018 with no extra
work: a deleted account shows as "Deleted account", someone who left as
"Name (left)", and renaming a group person renames them in every entry.
Previous values are kept only when they are fixed values (an ownership status
or a preference), never free text. If a future type ever needs free text,
account deletion has to blank it, with a test.

### Who sees it

Current members of the group only, checked by the backend on every request
through the membership. Someone who leaves loses access; their past actions
stay in the history under their standing.

### How long it is kept

For the life of the group. The feed loads in pages, so its length does not
matter. Deleting a group deletes its history, through the cascade from
`UserGroup` and an explicit delete in the group deletion for databases
without foreign keys.

### Notifications

The feed is where everyone sees what changed. Notifications stay narrow, so
the inbox keeps meaning something: when someone changes a group person's game
or preference that another member entered, that member is told. Game night
notifications stay as they are.

### A group person's games and preferences

Every member may now set a group person's games and preferences, not only
the owner. The history is what makes this safe: every change shows who made
it and can be undone by anyone. Creating, renaming and archiving group people
stays with the owner.

## Privacy

The history is personal data about members (what they did and when) and
about group people without an account (the games recorded for them). It is
processed to provide the service: a shared record is what a group signs up
for. Only identifiers and fixed values are stored, members see only their own
groups, and the retention ends with the group. Account deletion needs no
special step, because names are resolved when read. A group person without an
account who asks to be removed is renamed or archived by the owner, which
removes their name from every entry at once.

## Consequences

- Every write path that changes shared group data has to pass its activity
  entry to the query that saves the change. A new write path without one is a
  bug.
- Each entry adds one insert to the change's transaction.
- Reading the history resolves names for each page in a fixed number of
  queries.
- `GroupActivity` can only grow while the group exists. Its index is
  `(groupId, id)`, and pages are read newest first.

## Rejected alternatives

- **Copying names into entries.** They would outlive account deletion and
  need rewriting, which breaks append-only.
- **Database triggers that record changes.** SQLite triggers don't know who
  is acting, and they would record low-level row changes rather than what a
  person did.
- **Keeping only the last N entries**, as `CollectionActivity` does for one
  person's own activity. In a shared history a vanished entry is exactly the
  question this exists to answer.
- **Writing the entry after the change, outside its transaction.** It is
  simpler, but a failure between the two leaves a change with no entry.
