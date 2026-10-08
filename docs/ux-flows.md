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

A scheduled night is where the group decides what to play. Its games on
offer are the games of the people coming: invited and not declined.
Declining takes your games off the night; they stay listed as "nobody coming
owns it". The night shows the four best suggestions for the people coming,
which refresh as answers and invites change. The organizer can add one to the
shortlist in one tap.

History keeps everyone who played. Someone who left the group shows as
"Name (left)" with a muted avatar; a deleted account shows as "Deleted
account" with a grey avatar (ADR-0018). Neither changes a session's counts.

Browser coverage should use disposable local databases and synthetic provider
identities. It must not depend on production data, personal accounts, or
committed browser storage state.
