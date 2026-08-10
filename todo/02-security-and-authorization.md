# Security and authorization workstream

**Priority:** P0. Do not expose the application publicly until the critical items are resolved.

## Critical findings

### SEC-001 — prevent self-promotion to admin

The public user update DTO exposes privileged fields including `isAdmin`, verification state, and token fields. The update path appears to persist those fields.

Hotspots:

- `backend/src/common/types/user.type.ts`
- `backend/src/modules/core/users/users.controller.ts`
- `backend/src/modules/common/database/database.service.ts`

Required fix:

- create a public profile-update DTO containing only safe profile fields;
- remove privileged fields from all user-controlled request bodies;
- create a separate internal/admin-only path for account state changes;
- add an integration test proving a normal user cannot become an admin or verify their own email.

### SEC-002 — audit object-level authorization

Every endpoint must verify access to the exact target resource. Audit collection, dashboard, play, profile, groups, invitations, notifications, meetings, memberships, and meeting-game endpoints.

Required pattern:

```text
JWT identity
  → resource lookup
  → membership/ownership/role check
  → operation
```

Do not use a client-supplied `userId`, `reviewerId`, account ID, group ID, or owner ID as proof of authorization.

### SEC-003 — derive admin reviewer identity server-side

Admin review routes currently receive `reviewerId` from the request. Derive it from the authenticated JWT instead and reject mismatches.

Hotspot: `backend/src/modules/features/admin/admin.controller.ts`.

## Hardening tasks

- Add a global `ValidationPipe` with whitelist, forbidden extra fields, and transformation.
- Restrict CORS to configured origins.
- Add rate limits for login, registration, password reset, verification, and availability checks.
- Return a generic response from forgot-password requests.
- Add expiry and one-time-use semantics to verification and reset tokens.
- Decide whether to move browser auth from `localStorage` to a safer cookie/session design.
- Reject deleted or disabled users in JWT validation.
- Add security headers and request size limits.
- Remove sensitive SQL and token logging.
- Review password, email, and avatar exposure in all response DTOs.
- Add audit logging for privilege changes and admin actions.

## Required authorization test matrix

For each protected resource type, test:

- owner can read and mutate;
- non-owner cannot read private data;
- group member can perform member-level actions;
- non-member cannot access group data;
- group owner/admin can perform elevated actions;
- deleted, disabled, and unverified users are rejected as intended;
- changing a path ID or query ID cannot access another user’s data.

## Definition of done

- No user-controlled DTO contains authorization or token state.
- Every private endpoint has an explicit ownership, membership, or role check.
- Security tests run in CI.
- The security review records any intentional public endpoint and why it is public.
