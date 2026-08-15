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
- Parameterized libSQL statements are used for execution, although the database service separately formats arguments for logging.

## Material findings

- Authorization is inconsistent. User-scoped reads, legacy group listings, reviewed group routes, legacy meet reads, and every current collection route enforce ownership or membership checks; group and invitation/membership creation derives actors from the JWT; invitation cancellation/rejection/acceptance checks the sender or recipient; the deprecated direct-membership endpoint requires a pending invitation; notification reads/mutations, meet-account-game mutations, and proposal review actions are scoped to authenticated identities; the deprecated global user listing is administrator-only. User response-field/privacy review and the unfinished session model still need review. This remains the P0 security backlog.
- The public user profile-update route now forwards only `username`, `displayName`, and `avatar`; internal authentication workflows use a separate account-state update path. Broader object-level authorization remains unresolved.
- Legacy JWT validation now rejects soft-deleted accounts; disabled-account semantics beyond the existing `isDeleted` flag are not defined.
- Admin proposal review operations now derive `reviewedBy` from the authenticated administrator; broader admin action audit logging remains unresolved.
- Forgot-password requests now return the same successful outcome when the email is absent or present, reducing account-enumeration leakage; reset-token expiry and request rate limiting remain unresolved.
- Login, registration, password-reset, and availability query inputs now reject malformed, empty, and unexpected fields through targeted validation; global request validation remains intentionally unenabled pending a DTO compatibility audit.
- `main.ts` enables unrestricted CORS and does not configure global input validation or security headers/rate limits.
- `DatabaseService` now logs only parameterized SQL templates and excludes bound values; `EmailService` no longer logs recipient addresses; `CacheService` no longer logs keys or serialized payloads; auth/user-service logs no longer include email, username, or Clerk identity values. A global structured logging/redaction policy and provider-error handling remain unresolved.
- `EmailService` interpolates values into HTML email and logs recipient/provider context; output encoding and safe provider-failure behavior need review.
- Runtime configuration is only partly validated. `RESEND_API_KEY` fails later in provider construction, and `CacheService` initializes `Redis.fromEnv()` before checking its disabled flag.
- No security behavior test suite, secret scanning, vulnerability response process, or least-privilege deployment record was found.
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
