# ADR: Who may do what on a game night

- **Status:** Accepted
- **Date:** 2026-10-08
- **Supersedes:** The organizer-only checks on session changes (no earlier ADR)
- **Superseded by:** None

## Context

Before this decision only the person who planned a game night could change
anything on it: who is invited, the shortlist, starting and finishing it,
the games played, and who came. If they were away or late, the night stayed
"scheduled" for good, and nobody else could record what the group played.
Meanwhile the session page showed the invite and "mark as played" controls
to everyone, and the API refused them with a 403.

The night belongs to the people at the table, not to whoever happened to
type the date.

## Decision

Two roles, worked out on every request from the session, the group, and the
caller's own answer. Nothing new is stored.

| Role | Who |
| --- | --- |
| **Organizer** | Whoever planned the night, and the group owner |
| **Player** | The organizer, and anyone invited (directly or through a linked group person) who has not declined |

| Action | Who may do it |
| --- | --- |
| Change who is invited, replace or trim the shortlist | Organizer |
| Add a game to the shortlist, vote for shortlisted games | Player |
| Say you'll bring a shortlisted game you own | Player |
| Name a group person who owns a game as its bringer, clear anyone's | Organizer |
| Cancel the night | Organizer |
| Start and finish the night | Player |
| Mark games played and who played them | Player |
| Record who came | Player |
| Record who won and scores | Any group member (unchanged) |
| Answer "Can you make it?" | The invitee (unchanged) |

**Whoever played a game was there.** Marking players while the night is live,
starting or finishing it, and saving the attendance list all mark every
player as attended. Attendance is never turned off for someone who played.
The attendance list remains for people who came and did not play.

A caller outside the group gets 404, as before. A group member without the
role gets 403 with a sentence that names who may do it.

## Consequences

- A night can always be run by someone at the table.
- The group owner can tidy up any night in their group (cancel a forgotten
  one, fix the invite list), matching their role in acquisition decisions
  (ADR-0009).
- Declining a night takes away the right to run it. Changing your answer
  back to "I'm going" gives it back.
- Players can add a game to the shortlist and vote for shortlisted games
  (#114, `POST /sessions/:id/shortlist/:gameId`, `PUT|DELETE
  /sessions/:id/votes/:gameId`). Replacing or trimming the shortlist stays
  with the organizer.
- The legacy `meet-attendees` routes keep their creator-only check. The app
  no longer calls them.
