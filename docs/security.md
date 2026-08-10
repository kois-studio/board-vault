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
- `VerifiedUserGuard`, `UserOwnershipGuard`, `UserInGroupGuard`, and `AdminGuard` exist and are applied to selected controllers.
- Passwords use `bcryptjs` in the auth service.
- `.env` is ignored by `backend/.gitignore`, and `validateEnv.ts` checks Turso and JWT variables at startup.
- Parameterized libSQL statements are used for execution, although the database service separately formats arguments for logging.

## Material findings

- Authorization is inconsistent. Several legacy/core routes accept `accountId`, `groupId`, `meetId`, or other object identifiers with JWT authentication but without a uniform ownership or membership check. This is the P0 security backlog.
- User update fields include security-sensitive state in the service update path; the backlog explicitly requires removing privileged fields from public user updates.
- Admin proposal operations contain TODOs to obtain reviewer identity from JWT rather than request data.
- `main.ts` enables unrestricted CORS and does not configure global input validation or security headers/rate limits.
- `DatabaseService` logs SQL after interpolating values for display. This can expose email addresses, tokens, user data, or other input in logs.
- `EmailService` interpolates values into HTML email and logs recipient/provider context; output encoding, generic reset responses, and safe failure behavior need review.
- Runtime configuration is only partly validated. `RESEND_API_KEY` fails later in provider construction, and `CacheService` initializes `Redis.fromEnv()` before checking its disabled flag.
- No security behavior test suite, secret scanning, vulnerability response process, or least-privilege deployment record was found.

## Rules for security-sensitive changes

- Derive the acting user from the verified JWT, not from client-supplied identity fields.
- Authorize the target object and every sensitive mutation server-side; test cross-owner, cross-group, unauthenticated, unverified, expired-token, and admin/non-admin paths.
- Validate and safely encode untrusted input before it reaches SQL, HTML, logs, or provider APIs.
- Keep secrets out of source, browser bundles, logs, tests, fixtures, and documentation.
- Document data classification, retention/deletion, provider ownership, and recovery responsibilities before launch.

## Source evidence

- [JWT strategy](../backend/src/modules/common/auth/jwt-strategy.ts)
- [Guards](../backend/src/common/guards/)
- [Environment validation](../backend/src/common/validators/validateEnv.ts)
- [User controller/service](../backend/src/modules/core/users/users.controller.ts)
- [Admin controller](../backend/src/modules/features/admin/admin.controller.ts)
- [Database logging](../backend/src/modules/common/database/database.service.ts)
- [Email integration](../backend/src/modules/common/email/email.service.ts)
- [Security workstream](../todo/02-security-and-authorization.md)
