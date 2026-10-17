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
(everyone invited). Members hear when someone joins their group, and when
someone changes a game or preference they entered for a group person. The
person who acted is never notified. Each notification links to the night or
group.

Settings → **Privacy** has one switch, "Help improve Board Vault", on by
default: usage statistics of our own ([ADR-0021](adr/0021-own-usage-analytics.md)).
Everyone is told once: the invitation sign-up form has the same switch, and
until an account answers, a "Lend us a hand?" card above every signed-in page
explains it with the switch and "Got it". Flipping the switch or "Got it"
answers it for good; turning it off gets "No problem, thanks for playing
anyway!".
While signed in, each page shown is counted with the page before it, and
actions (adding a game, rating, planning or finishing a night, …) with the
screen they came from. Nothing is stored in the browser. Turning it off stops
counting at once and deletes the account's recent events. Admins read the
results in Administration → **Usage**: people and events per day, pages and
ways in, actions and where they come from, two funnels, and monthly totals.

Every group page ends with **What changed**, the group history
([ADR-0020](adr/0020-group-history.md)): who planned, started or cancelled a
night, changed its invitations, shortlist, bringers, games played or results,
answered it, added or changed a group person and their games, joined, left or
was removed. Newest first, ten at a time with "Show older changes", each with
a link to its night when it has one. Entries can't be edited: a mistake is
fixed by changing it back, and both changes stay. People show under their
current name, "Name (left)" or "Deleted account". Any member can edit a group
person's games and preferences; creating, renaming and archiving people stays
with the owner.

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

Record a session (primary) and Plan a game night remain visible on desktop
and phones, whether or not history exists. Upcoming/live nights retain RSVP,
shortlists and bringers, without a repeated planning empty-state prompt.
Pending invitations remain prominent. Accounts without a group retain the
first-group setup path.

One group or several use the same card: group identity, next/last play,
scoped Record and Plan actions, Start playing now, What to play, Library and
History. Every group-specific recording entry keeps its group selected.
Pins belong to the account and appear first in the chosen pin order, moved
with accessible up/down buttons. Unpinned groups sort by date played (default),
next night, or name, with stable name/id ties. Loading/failure of preferences
leaves the groups usable and offers Retry. Preferences follow the account
across devices; they do not change other people's Home.

Home shows up to three optional, dismissible personal rating suggestions for
games the account actually played and has not rated. Existing ratings are
reused. Membership and collection maintenance stay within their contexts.
Fully customizable Home is deferred to discovery issue #164.

## Record or correct a session

Recording has three steps: who and when, games and their players, note and
review. Today/Yesterday supplement the date picker; the selected full date
appears in the final summary. Same-day sessions in the selected group are
suggested without preventing a separate gathering.

Attendees' games are the initial offer. Search all games can add any catalogue
game without first recording ownership. Every selected game starts with all
attendees as players, individually removable. Played it again adds a separate
play with its own players, optional winners and integer scores. A save is one
transaction. Failed saves retain choices. Completed recordings open the saved
session, with an optional personal rating follow-up and ownership entry naming
My Games or a particular person without an account.

An organizer, group owner or invited non-declined player can open Correct
session on a completed night, or Edit games and players while active. The
same form loads the recording, preserves separate plays/results and the
session's group/status, and writes a new group-history entry. Former people
already in the recording can stay. Changing active invitations is restricted
to the organizer. Another edit, results save, or lifecycle change invalidates
a stale form: saving answers 409 and asks to reload, without overwriting it.
Any group member can save results separately for each play.

Start playing now uses the who step and creates an active night using the
current server time, without requiring games or an earlier planned session.
People and games can then be added as the afternoon unfolds. Planning retains
its existing ownership and shortlist rules.

## Ownership

My Games links to catalogue browsing. A person without an account has Add a
game for [name] on their group page; it searches the catalogue and explicitly
names the owner before saving. This is a group-scoped ownership statement,
visible and editable by the group's members, never another account's private
collection. Session ownership follow-up is optional and independent of the
already-saved play history.

## Browser coverage

Browser coverage should use disposable local databases and synthetic provider
identities. It must not depend on production data, personal accounts, or
committed browser storage state.
