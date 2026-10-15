# Core user flows

The primary product loop is:

1. create or join an invite-only group;
2. add private games and shared group context;
3. select participants and receive explainable recommendations;
4. plan or record a session;
5. preserve the session and play history for later decisions.

Every flow should define loading, empty, error, retry, permission, refresh, and
mobile states. Invitation and participant-claim flows must distinguish a real
account from a group-scoped placeholder and must not expose another account's
private collection.

Answering a game night should never need a detour: wherever a night is
listed for someone it invites (Home, Upcoming), `<app-session-answer>` shows
their answer and lets them change it while the night is scheduled or live.
The session list (`GET /play/users/:userId/meets`) carries the caller's own
`myRsvpStatus` for that.

People hear about a game night in their inbox: when it is planned (everyone
invited), started or finished (everyone who did not decline), or cancelled
(everyone invited). Members hear when someone joins their group. The person
who acted is never notified. Each notification links to the night or group.

A scheduled night is where the group decides what to play. Its games on
offer are the games of the people coming: invited and not declined.
Declining takes your games off the night; they stay listed as "nobody coming
owns it". The night shows the four best suggestions for the people coming,
which refresh as answers and invites change. Anyone coming can add one to the
shortlist (it starts with their vote) and vote for shortlisted games; the
shortlist puts the most wanted first. What to play offers "Add to <next
night>" for the group's next planned night you are coming to.

Each shortlisted game says who brings it. Someone coming who owns it taps
"I'll bring it"; the organizer can name a person without an account who owns
it. A game nobody coming owns is flagged, and one with owners but no bringer
says so. Declining a night clears what you were bringing. Home shows "You're
bringing: …" on each night.

The group owner invites from one field on Manage group: a username sends an
in-app invitation, an email a Clerk one. Either can name a person without an
account; the invitee reviews what was recorded for that person and claims it
(ADR-0010). Each such person on the group page has an "Invite" link that
opens Manage group with them chosen (`?person=<id>`).

History keeps everyone who played. Someone who left the group shows as
"Name (left)" with a muted avatar; a deleted account shows as "Deleted
account" with a grey avatar (ADR-0018). Neither changes a session's counts.

## Home

Home follows where the person is. Pending invitations always come first.

- **No group yet:** one card to create the first group (an invitation shows
  up above it), and a three-step checklist: create a group, add your games,
  plan a night. Nothing that would still be empty is shown.
- **Any group:** the next game night leads, with its date, group, how many are
  going and have not answered, the shortlist (most-voted first), what you are
  bringing, and your answer. The next two nights follow as short rows. With
  nothing planned, one row offers to plan (straight into the group when there
  is only one).
- **One group:** a large card with its people and three shortcuts (what to
  play, its library, its history). Its owner is nudged to invite people while
  the group has fewer than four.
- **Several groups:** compact rows, ordered by a night under way, then the
  soonest planned, then the most recently played, each saying which.
- **History:** the last three nights, or one row inviting to record a past
  night when there are none.

Creating another group is a small "+ New group" link; it is a rare action
once someone has a group.

## Browser coverage

Browser coverage should use disposable local databases and synthetic provider
identities. It must not depend on production data, personal accounts, or
committed browser storage state.
