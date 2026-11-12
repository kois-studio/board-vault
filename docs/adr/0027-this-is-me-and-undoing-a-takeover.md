# ADR: "This is me", and undoing a takeover

- **Status:** Accepted
- **Date:** 2026-11-11
- **Supersedes:** In [ADR-0010](0010-group-person-identities.md), the rule that only the account an invitation suggested may claim a person without an account
- **Superseded by:** None

## Context

A group often records people before they have an account: "Carlos", with the
games the group says he owns and the game nights he came to (ADR-0010). When
Carlos joins, he should take that history over instead of starting empty.

Until now only the inviter could decide that. An invitation could suggest a
person, and only the account it was sent to could claim them (#277). An
invitation without a suggestion made the newcomer a new person straight away,
and their old history stayed with a "Carlos" nobody could become. The inviter
often doesn't know, or forgets, to make the suggestion.

Letting the newcomer pick fixes that, but anyone can pick the wrong person.
Then they may drop "Carlos's" games while reviewing, and record new nights
under his name. The group needs a quick way to put Carlos back.

## Decision

### Who may take someone over

Any member of the group who is not one of its people yet may take over any
active person without an account in that group. Membership is checked by the
backend; the target's group, kind (`placeholder`), status (`active`) and
missing account are checked in the same transaction that links it. Once a
member is one of the group's people, they cannot take over anyone else.

An invitation that suggests a person no longer decides who may take them
over. It puts that person first, as "Is this you?", for as long as it hasn't
expired. Taking someone over, or leaving the group, uses the suggestion up,
as before (#277).

### Joining

Accepting an invitation without a suggestion makes the newcomer a new person,
as before, unless the group has active people without an account. Then they
join with no person yet, and the app opens "Who are you in this group?"
(`/groups/:groupId/people/choose`). It lists those people, the suggested one
first, with the games the group says they own and the finished game nights
they came to. Each has "This is me", which opens the review page that was
already there (keep or drop each game and preference, optionally copy the
kept games to your own shelf). "I'm new here" makes them a new person. The
group page offers the same choice until they make it.

### Snapshot

Taking someone over writes a snapshot in the same transaction
(`GroupPersonTakeover`, one row per person). It holds the person's name,
picture and status; their game and preference rows as stored; and the ids of
the game nights they were on (attendance, plays, results, bringing a game).
It holds nothing about the account that took them over.

### Undo

For 30 days after a takeover, any member of the group may undo it, the person
who took over included, after a confirmation. Undo is one transaction:

- The person gets back the snapshot's name, picture, status, games and
  preferences, including any removed since. They have no account again.
- The account that took them over becomes a new person of the group.
- Game nights the person was on before the takeover keep pointing at them.
  Any other night where they appear (attendance, plays, results, who brings a
  game) was the new member's, and moves to the new person.
- Game and preference rows added after the takeover for games the snapshot
  doesn't have also move to the new person.
- The new member's own shelf (`OwnedGame`) is not touched, including games
  copied to it during the takeover. It is their private collection; they
  remove what isn't theirs.
- A `person_takeover_undone` entry goes into the group history (ADR-0020),
  with the account that had taken the person over as its subject. That
  account is notified unless it undid it itself or has left the group.
- The snapshot is deleted.

### How long a snapshot is kept

Thirty days, then undo is refused and the daily job deletes the row. A wrong
pick shows up within the first nights; after a month, the person's nights
and games have been edited enough that "as before" would no longer be what
the group means. Deleting the account that took someone over deletes its
snapshots; deleting the group deletes all of them.

## Privacy

The snapshot copies a name, which ADR-0020 rules out for the group history.
It is a separate table with a short life: what the group itself recorded
about one of its people, kept 30 days to give it back. Only members of the
group can read a pending takeover (the previous name and when it happened).
Account deletion removes the snapshots of the account that took people over.
The person who was taken over has no account, so there is nothing else to
remove.

## Consequences

- `GET /groups/:groupId/people` marks `claimable` (may take over) and
  `suggested` (an invitation suggested them). `GET
  /groups/:groupId/people/choices` lists the choices with games and nights,
  `GET /groups/:groupId/people/takeovers` lists what can still be undone, and
  `POST /groups/:groupId/people/:personId/takeover/undo` undoes one.
- Accepting an invitation answers `choosePerson` and the group id, and the
  inbox opens "Who are you in this group?" when it is true.
- A person's page shows "Ana took over Carlos on …" with "Undo takeover…"
  while it can be undone, and the history links that entry to it.
- Every place that stores a group person on a game night has to be moved by
  the undo. A new one (a table or a JSON field) needs adding to
  `TakeoverQueries.undo`.

## Rejected alternatives

- **Keeping claims to suggested people only.** It depends on the inviter
  knowing and remembering, and leaves the newcomer no way to say "that's me".
- **Undo without a snapshot**, by replaying the group history backwards. The
  history keeps references and fixed values only (ADR-0020), not the rows a
  takeover changes, and a takeover can drop several games at once.
- **Keeping snapshots for the life of the group.** Undo would grow less
  meaningful and more surprising with time, and the copied name would stay.
- **Moving nights by date.** A night recorded late, or corrected after the
  takeover, would land on the wrong side. The snapshot says exactly which
  nights were the person's.
- **Removing games copied to the new member's shelf on undo.** Another member
  would be changing someone's private collection.
