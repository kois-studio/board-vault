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

History keeps everyone who played. Someone who left the group shows as
"Name (left)" with a muted avatar; a deleted account shows as "Deleted
account" with a grey avatar (ADR-0018). Neither changes a session's counts.

Browser coverage should use disposable local databases and synthetic provider
identities. It must not depend on production data, personal accounts, or
committed browser storage state.
