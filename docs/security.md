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
- `VerifiedUserGuard`, `UserOwnershipGuard`, `UserInGroupGuard`, `GroupOwnerGuard`, and `AdminGuard` exist and are applied to the feature and legacy user-data controllers as appropriate.
- Passwords use `bcryptjs` in the auth service.
- Clerk backend verification, exact-primary-email linking, new-account provisioning, and Clerk-aware request identity resolution are implemented behind `/auth/clerk/status` and the protected-route middleware. Local `isAdmin` remains authoritative, and the existing JWT/password path remains available during the rollout.
- Production self-registration is now private-beta by default. Clerk production is configured with `auth_access_control.sign_up_mode=restricted`; the backend also blocks legacy registration, email/username availability probing, and unknown-Clerk-account provisioning unless `BOARD_VAULT_SELF_REGISTRATION_ENABLED=true` is explicitly set. Preserved accounts can still sign in and link to Clerk through the verified exact-email migration path.
- Group owners can create a Clerk email invitation without reopening public registration. The invitation carries server-created group/owner metadata; after the invitee completes the verified Clerk flow, the identity bridge validates that the group still belongs to the inviter before inserting membership. The redirect URL is deployment configuration, and the legacy username invitation remains the path for existing local accounts.
- Legacy username invitations now have a bounded 30-day lifetime: existing rows are backfilled from `sentAt`, new rows receive a server-side expiry, expired invitations disappear from pending feeds, and stale acceptance is rejected with a request for a new invitation. Migration `0008` is verified locally but remains pending for live deployment; the Clerk provider invitation path remains provider-managed.
- The deprecated `POST /users/` account-creation route was removed because it could create arbitrary local accounts outside the canonical auth/registration policy; internal account creation remains available only to the auth service and verified Clerk provisioning flow.
- `.env` is ignored by `backend/.gitignore`, and `validateEnv.ts` checks Turso and JWT variables at startup.
- Parameterized libSQL statements are used for execution, and database logging now excludes bound argument values.

## Material findings

- Authorization is inconsistent. User-scoped reads, legacy group listings, reviewed group routes, legacy meet reads, and every current collection route enforce ownership or membership checks; group and invitation/membership creation derives actors from the JWT; pending group-invitation reads are owner-only; legacy invitation list/detail reads are scoped to the authenticated recipient or sender; invitation cancellation/rejection/acceptance checks the sender or recipient, and acceptance now consumes the invitation atomically with membership creation; the deprecated direct-membership endpoint requires a pending invitation; notification reads/mutations, meet-account-game mutations, organizer-only attendee management, and proposal review actions are scoped to authenticated identities; the deprecated global user listing and cache maintenance endpoints are administrator-only. Public nested-user responses use `UserPublicDto`, and the authenticated self-profile now uses `UserSelfDto` without account-state fields. Session transaction policy and broader object-level review remain open. Production attendee-route verification remains outstanding. This remains the P0 security backlog.
- The public user profile-update route now uses a dedicated strict DTO, rejects privileged/unknown fields and malformed nested avatar data before service access, and forwards only `username`, `displayName`, and `avatar`; the deprecated user game-update route validates positive integer arrays and rejects unknown fields; collection ownership metadata, deprecated membership references, administrator catalog/proposal-review, group, invitation, and notification write bodies now use controller-local strict validation; internal authentication workflows use a separate account-state update path. Broader object-level authorization remains unresolved.
- Legacy JWT validation now rejects soft-deleted accounts; disabled-account semantics beyond the existing `isDeleted` flag are not defined.
- Admin proposal review operations now derive `reviewedBy` from the authenticated administrator; broader admin action audit logging remains unresolved.
- Forgot-password requests now return the same successful outcome when the email is absent or present, reducing account-enumeration leakage; reset-token expiry and route-specific rate limiting are now enforced.
- Login, registration, password-reset, availability-query, legacy token path, profile, game-update, review, proposal, administrator catalog/review inputs, and admin list queries now reject malformed, empty, unexpected, or unbounded values through targeted validation; registration and availability checks additionally fail closed during private beta, unverified legacy accounts cannot authenticate, and legacy user-data controllers also require verified-user state. `main.ts` also installs a global strict `ValidationPipe` safety net. Validation failures and unexpected 5xx responses are normalized by `ApiErrorFilter` into a safe correlated envelope.
- Verification tokens expire after 24 hours and password-reset tokens expire after 1 hour, using UTC epoch seconds persisted in `Account`. Verification and password reset consume tokens through one conditional database update that clears the token and its expiry; expired, legacy-null-expiry, and already-consumed tokens fail closed.
- `main.ts` restricts production CORS to `https://board-vault.com` plus explicitly configured additions; local development additionally allows the two observed local origins. Wildcards are ignored and credentialed cookies remain disabled. Legacy authentication endpoints have Upstash-backed fixed-window limits: registration 5/minute, login and verification/reset 10/minute, and availability checks 30/minute. The limiter fails open only when Redis is explicitly disabled or unavailable; production must keep Redis enabled.
- The API bootstrap explicitly limits JSON and URL-encoded request bodies to 100 KB and sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`; HSTS is emitted only when `NODE_ENV=production`. Regression tests cover oversized JSON rejection and the response-header policy.
- `DatabaseService` now logs only parameterized SQL templates and excludes bound values; `EmailService` no longer logs recipient addresses; `CacheService` no longer logs keys or serialized payloads; auth/user-service logs no longer include email, username, or Clerk identity values. `ApiErrorFilter` hides unexpected exception/provider details from 5xx responses and adds a request correlation ID. A global structured logging/redaction policy and provider-error handling remain unresolved.
- Nested user responses use `UserPublicDto` with only identity/display fields; the authenticated self-profile uses `UserSelfDto` with email and identity metadata but excludes deletion, administrator, and verification state; admin/auth-status contracts remain the dedicated state boundaries. The full response-DTO and client response-schema audit remains open.
- `EmailService` now HTML-escapes notification text and generated links before interpolation; provider-failure behavior, timeout policy, and recipient/provider context remain under review.
- Runtime configuration is only partly validated. `RESEND_API_KEY` fails later in provider construction; Redis credentials are now required unless `UPSTASH_REDIS_REST_DISABLE=true`, while broader provider timeout and ownership checks remain unresolved.
- No comprehensive security behavior suite, secret scanning, vulnerability response process, or least-privilege deployment record was found; focused authorization, validation, logging, token-lifecycle, and rate-limit regression tests now exist.
- Clerk production readiness is incomplete: the production instance/domain and restricted sign-up mode are configured, while full cutover/recovery testing and legacy-auth retirement remain open.

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
- [Clerk session middleware](../backend/src/common/middlewares/clerk-session.middleware.ts)
- [Guards](../backend/src/common/guards/)
- [Environment validation](../backend/src/common/validators/validateEnv.ts)
- [Registration policy](../backend/src/common/registration-policy.ts)
- [HTTP hardening](../backend/src/common/http/http-hardening.ts)
- [User controller/service](../backend/src/modules/core/users/users.controller.ts)
- [Admin controller](../backend/src/modules/features/admin/admin.controller.ts)
- [Database logging](../backend/src/modules/common/database/database.service.ts)
- [Email integration](../backend/src/modules/common/email/email.service.ts)
- [Security workstream](../todo/02-security-and-authorization.md)
