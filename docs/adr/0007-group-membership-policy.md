# ADR: Invite-only group membership with owner/member roles

- **Status:** Accepted
- **Date:** 2026-08-16
- **Supersedes:** None
- **Superseded by:** None

## Context

Board Vault groups contain private collections, member identities, invitations,
and session history. The existing implementation creates an owner membership,
supports invitations, and has owner-only management actions, but the product
backlog did not state whether arbitrary self-joining or richer roles were part
of the first release.

## Decision

For the first release, group membership is **invite-only**. A person becomes a
member by accepting an invitation addressed to their account. There is no
public group directory or arbitrary self-join flow.

The first-release role model has two roles:

- **Owner:** the group creator; can edit or delete the group, invite/remove
  members, and view pending invitation details.
- **Member:** can view shared group content, use the group for recommendations,
  and participate in sessions, but cannot manage membership or group settings.

The owner cannot leave the group through the member leave flow. Transfer of
ownership, multiple owners, moderators, public groups, and join requests are
deferred until a concrete product need exists.

## Consequences

- Private group data and pending invite identities have a clear first-release
  boundary.
- The API can enforce a small, testable owner/member authorization matrix.
- The frontend must not fetch or present pending invitation details to members.
- A future public-group or role expansion requires a new ADR and explicit
  authorization tests.

## Alternatives considered

- **Open self-join:** simpler discovery, but exposes private groups and creates
  moderation and membership-removal requirements before the core loop is proven.
- **Rich role system:** more flexible, but unnecessary for the initial organizer
  persona and would expand the authorization surface prematurely.
