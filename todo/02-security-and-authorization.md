# Security and authorization workstream

**Priority:** P0. Do not expose the application publicly until the critical items are resolved.

## Critical findings

### SEC-001 — prevent self-promotion to admin

The historical public user update DTO exposed privileged fields including `isAdmin`, verification state, and token fields. The current profile-update boundary is remediated with a dedicated strict DTO, and the backend now enables global strict validation as a safety net after the highest-risk DTO audit slices were covered. Continue auditing remaining request DTOs and client negative cases.

Hotspots:

- `backend/src/common/types/user.type.ts`
- `backend/src/modules/core/users/users.controller.ts`
- `backend/src/modules/common/database/database.service.ts`

Completed boundary:

- the public profile-update DTO contains only `username`, `displayName`, and `avatar`;
- privileged fields are rejected before service/database access;
- internal authentication workflows use a separate account-state update path;
- regression tests prove privileged fields and malformed nested avatar data are rejected.

Continue the same audit pattern for remaining body/query DTOs and client negative cases under the active global validation policy.

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
- Restrict CORS to configured origins. **Implemented:** production Board Vault and observed local development origins are allowlisted; optional `CORS_ORIGINS` additions are supported; credentialed cookies remain disabled.
- Add rate limits for login, registration, password reset, verification, and availability checks. **Implemented:** Upstash-backed fixed-window limits are applied per route; production must keep Redis enabled, while explicitly disabled local mode fails open.
- Return a generic response from forgot-password requests. **Implemented:** known and unknown emails now receive the same successful outcome; the forgot-password route is also rate limited.
- Add expiry and one-time-use semantics to verification and reset tokens. **Implemented and deployed:** verification tokens expire after 24 hours and password-reset tokens after 1 hour; atomic conditional updates clear consumed tokens; migration `database/migrations/0002-add-auth-token-expiry.sql` was applied and verified in live Turso on 2026-08-16.
- Decide whether to move browser auth from `localStorage` to a safer cookie/session design.
- Reject deleted or disabled users in JWT validation. **Partial:** soft-deleted accounts are rejected; a separate disabled-account state is not modeled.
- Add security headers and request size limits. **Implemented baseline:** JSON/URL-encoded bodies are limited to 100 KB; baseline content-type, framing, referrer, permissions, and production HSTS headers are emitted. Comprehensive transport tests and any endpoint-specific size policy remain open.
- Remove sensitive SQL and token logging. **Partial:** database bound values, email recipients, cache keys/payloads, and auth identity values are excluded; global structured redaction and provider-error policy remain open.
- Clerk-managed authentication. **In progress:** verified Clerk sessions resolve to local authorization identities, exact-email links and new local accounts are supported, and legacy JWT remains as a recovery path; production Clerk/Vercel configuration, deployed-origin verification, and rollback evidence are still required.
- Review password, email, and avatar exposure in all response DTOs. **Partial:** nested group/member, invitation, play-history, and invitation-by-username responses use `UserPublicDto`, while `/profile/users/:userId` now uses `UserSelfDto` without account-state fields; remaining admin response contracts and the broader client response-schema review remain open.
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
