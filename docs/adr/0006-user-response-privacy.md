# ADR: Public nested-user response boundary

- **Status:** Accepted
- **Date:** 2026-08-15
- **Supersedes:** None
- **Superseded by:** None

## Context

The legacy `UserGetDto` contains email and account-state fields for internal
and administrator paths. Several older feature responses reused that type for
nested group members, invitations, and play history. That made it easy to
disclose private account data to another authenticated user and made response
privacy depend on callers remembering to remove fields.

## Decision

Use separate response boundaries:

- `UserSelfDto` is the authenticated self-profile boundary. It contains email
  and identity metadata but excludes account deletion, administrator, and
  verification state.
- `UserGetDto` remains available for internal and administrator boundaries. It
  excludes passwords and authentication tokens from serialized responses.
- `UserPublicDto` is the only user shape for nested or public identity data. It
  contains `id`, `username`, `displayName`, and `avatar`.
- Group members, played-by history, invitations, invitation-by-username
  responses, and any future nested user representation use `UserPublicDto` (or
  a specialized type extending it).
- Email, deletion state, administrator state, and verification state are not
  part of nested user responses. They may be returned only from a dedicated
  authenticated/admin endpoint whose policy requires them.
- The public projection is enforced in service construction and in the SQL
  projection used for group invitations; TypeScript types alone are not the
  security boundary.

## Consequences

- Existing consumers of nested users lose fields that were not appropriate for
  those contexts. The frontend currently uses identity/display fields for
  those views, but a response-contract review remains required before wider
  client changes.
- Self-profile, administrator, and auth-status response policies remain
  separate and are not silently broadened by this decision.
- Future response DTOs must choose explicitly between private/self, admin, and
  public identity boundaries.
- This does not complete global request validation, response schema validation,
  or the broader object-authorization audit.

## Evidence

- [Public user DTO](../../backend/src/common/types/user.type.ts)
- [Public user projection service](../../backend/src/modules/core/users/users.service.ts)
- [Group invitation projection](../../backend/src/modules/common/database/database.service.ts)
- [Privacy regression test](../../backend/src/modules/core/users/users.service.privacy.spec.ts)
- [Angular response types](../../frontend/src/app/api/api.types.ts)
