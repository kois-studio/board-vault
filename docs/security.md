# Security boundaries and current findings

## Assets and actors

The system handles account credentials and identity data, verification/reset tokens, user profiles, game collections, reviews, group membership/invitations, notifications, meeting/play history, and admin-managed catalog/proposal data. Actors include unauthenticated visitors, authenticated users, group members, verified users, administrators, the Angular browser client, the Nest API, Turso, Upstash Redis, Resend, and the Vercel-hosted deployment.

## Trust boundaries

```text
Browser/user input
  → Angular forms and API adapter
  → Internet/API boundary
  → Nest guards/controllers/validation boundary
  → Feature/core services
  → Turso, Redis, Resend provider boundaries
```

The backend is authoritative for authentication, authorization, data validation, and sensitive operations. Frontend guards and hidden controls improve UX only; they are not security enforcement.

## Existing controls

- JWT bearer authentication uses `passport-jwt` and rejects expired tokens through `ignoreExpiration: false`.
- `VerifiedUserGuard`, `UserOwnershipGuard`, `UserInGroupGuard`, `GroupOwnerGuard`, and `AdminGuard` exist and are applied to selected controllers.
- Passwords use `bcryptjs` in the auth service.
- Clerk backend verification and a conservative exact-primary-email identity bridge are implemented behind the isolated `/auth/clerk/status` route. The existing JWT/password routes are still authoritative until the migration rollout is complete.
- `.env` is ignored by `backend/.gitignore`, and `validateEnv.ts` checks Turso and JWT variables at startup.
- Parameterized libSQL statements are used for execution, and database logging now excludes bound argument values.

## Material findings

- Authorization is inconsistent. User-scoped reads, legacy group listings, reviewed group routes, legacy meet reads, and every current collection route enforce ownership or membership checks; group and invitation/membership creation derives actors from the JWT; invitation cancellation/rejection/acceptance checks the sender or recipient; the deprecated direct-membership endpoint requires a pending invitation; notification reads/mutations, meet-account-game mutations, and proposal review actions are scoped to authenticated identities; the deprecated global user listing is administrator-only. A public nested-user response boundary is now enforced for group members, invitations, and play history; the self-profile/admin DTO policy and unfinished session model still need review. This remains the P0 security backlog.
- The public user profile-update route now uses a dedicated strict DTO, rejects privileged/unknown fields and malformed nested avatar data before service access, and forwards only `username`, `displayName`, and `avatar`; the deprecated user game-update route validates positive integer arrays and rejects unknown fields; internal authentication workflows use a separate account-state update path. Broader object-level authorization remains unresolved.
- Legacy JWT validation now rejects soft-deleted accounts; disabled-account semantics beyond the existing `isDeleted` flag are not defined.
- Admin proposal review operations now derive `reviewedBy` from the authenticated administrator; broader admin action audit logging remains unresolved.
- Forgot-password requests now return the same successful outcome when the email is absent or present, reducing account-enumeration leakage; reset-token expiry and route-specific rate limiting are now enforced.
- Login, registration, password-reset, availability-query, legacy token path, profile, game-update, review, proposal, and administrator catalog/review inputs now reject malformed, empty, and unexpected values through targeted validation; global request validation remains intentionally unenabled pending a DTO compatibility audit.
- Verification tokens expire after 24 hours and password-reset tokens expire after 1 hour, using UTC epoch seconds persisted in `Account`. Verification and password reset consume tokens through one conditional database update that clears the token and its expiry; expired, legacy-null-expiry, and already-consumed tokens fail closed.
- `main.ts` restricts CORS to `https://board-vault.com`, the two observed local development origins, and optional comma-separated `CORS_ORIGINS` additions. Credentialed cookies remain disabled. Legacy authentication endpoints have Upstash-backed fixed-window limits: registration 5/minute, login and verification/reset 10/minute, and availability checks 30/minute. The limiter fails open only when Redis is explicitly disabled or unavailable; production must keep Redis enabled.
- The API bootstrap explicitly limits JSON and URL-encoded request bodies to 100 KB and sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`; HSTS is emitted only when `NODE_ENV=production`. A comprehensive header/oversized-request test remains open.
- `DatabaseService` now logs only parameterized SQL templates and excludes bound values; `EmailService` no longer logs recipient addresses; `CacheService` no longer logs keys or serialized payloads; auth/user-service logs no longer include email, username, or Clerk identity values. A global structured logging/redaction policy and provider-error handling remain unresolved.
- Nested user responses use `UserPublicDto` with only identity/display fields; email, deletion, administrator, and verification state remain reserved for dedicated self/admin boundaries. The full response-DTO and client response-schema audit remains open.
- `EmailService` interpolates values into HTML email and logs recipient/provider context; output encoding and safe provider-failure behavior need review.
- Runtime configuration is only partly validated. `RESEND_API_KEY` fails later in provider construction; Redis credentials are now required unless `UPSTASH_REDIS_REST_DISABLE=true`, while broader provider timeout and ownership checks remain unresolved.
- No comprehensive security behavior suite, secret scanning, vulnerability response process, or least-privilege deployment record was found; focused authorization, validation, logging, token-lifecycle, and rate-limit regression tests now exist.
- Clerk production readiness is incomplete: the development instance and local authorized-party test are configured, and one existing-account identity link has been verified, but no production instance, production origin policy, or full migration/cutover test suite has been recorded.

## Rules for security-sensitive changes

- Derive the acting user from the verified JWT, not from client-supplied identity fields.
- Authorize the target object and every sensitive mutation server-side; test cross-owner, cross-group, unauthenticated, unverified, expired-token, and admin/non-admin paths.
- Validate and safely encode untrusted input before it reaches SQL, HTML, logs, or provider APIs.
- Keep secrets out of source, browser bundles, logs, tests, fixtures, and documentation.
- Document data classification, retention/deletion, provider ownership, and recovery responsibilities before launch.

## Source evidence

- [JWT strategy](../backend/src/modules/common/auth/jwt-strategy.ts)
- [Clerk guard](../backend/src/common/guards/clerk-auth.guard.ts)
- [Clerk identity bridge](../backend/src/modules/common/auth/clerk-identity.service.ts)
- [Guards](../backend/src/common/guards/)
- [Environment validation](../backend/src/common/validators/validateEnv.ts)
- [User controller/service](../backend/src/modules/core/users/users.controller.ts)
- [Admin controller](../backend/src/modules/features/admin/admin.controller.ts)
- [Database logging](../backend/src/modules/common/database/database.service.ts)
- [Email integration](../backend/src/modules/common/email/email.service.ts)
- [Security workstream](../todo/02-security-and-authorization.md)
