# ADR: Group-scoped placeholder identities

- **Status:** Accepted
- **Date:** 2026-09-26
- **Supersedes:** None
- **Superseded by:** None

## Context

Board Vault’s first group model assumed every participant was a registered
`Account`. That makes a group organizer do unnecessary onboarding work before
they can record a normal game night. It also makes it impossible to preserve a
participant’s group history when that person registers later without creating
an artificial account.

## Decision

Introduce `GroupPerson` as the stable, group-scoped identity for somebody who
appears in a group’s games, recommendations, sessions, and history.

- `Account` remains the authentication, private collection, and authorization
  identity.
- `GroupMembership` remains the authorization boundary for real accounts.
- A `GroupPerson` may be a `placeholder` with no account or a `linked` person
  associated with exactly one account in that group.
- Existing group members are backfilled as linked group people. New accounts
  may join a group as a new linked person, while a targeted invitation may
  claim an existing placeholder.
- Placeholder ownership and preferences are group assertions, with source and
  status recorded separately from private `OwnedGame` rows.
- Claiming is authenticated, email-targeted, atomic, idempotent, and reviewed
  by the invitee. Kept ownership may optionally be copied into the invitee’s
  private collection; history is never copied or rewritten.
- Historical session relations reference the stable `GroupPerson` ID, so a
  claim changes the identity’s account link without changing past sessions.

The user-facing term is “group person” or “person in this group”. “Mock
account” is an implementation explanation only and is not a product term.

## Consequences

The API and UI must validate group-person IDs against the target group and
active status. Owner-only mutations manage placeholder names, ownership, and
preferences; ordinary group members can read and use participant identities.
RSVP remains a real-account capability, while organizers record attendance for
placeholders. Account deletion or leaving a group must not delete historical
participant references.

Migrations are additive and preserve the legacy account-oriented session and
invitation contracts during rollout. Live rollout still requires the normal
backup, migration, schema verification, and rollback procedure.

## Rejected alternatives

- Creating synthetic `Account` rows for friends: this pollutes authentication
  and private collection semantics and creates unsafe account ownership.
- Keeping participant names only on sessions: this duplicates identity and
  cannot support recommendations, shared ownership, or later claiming.
- Silently importing placeholder data into a private collection: this gives an
  invitee no correction or consent step.
