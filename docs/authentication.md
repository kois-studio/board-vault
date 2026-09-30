# Authentication boundaries

Clerk is the only identity provider ([ADR-0012](adr/0012-clerk-only-authentication.md)).
Clerk owns credentials: passwords, email codes, email verification, password
reset, and device checks. Board Vault owns the local `Account` record, which
is the profile and authorization boundary. Local account state, not Clerk
claims, decides administrator and group access.

The main state transitions are:

1. an unauthenticated visitor reaches the public shell;
2. the visitor signs in or accepts an invitation through Clerk;
3. the frontend sends the Clerk session token as a Bearer token;
4. `ClerkSessionMiddleware` verifies the token and resolves the account:
   - a linked account (matching `clerkUserId`) is used, unless it is deleted;
   - otherwise, a Clerk user with a verified primary email is provisioned as a
     new account when it arrives through a group invitation or self-registration
     is enabled (ADR-0008);
   - a verified email that already belongs to an unlinked account is refused
     with `409 ACCOUNT_EMAIL_CONFLICT` and is never linked automatically;
5. `AuthGuard` admits requests with a resolved account, and later guards apply
   ownership, membership, and admin rules;
6. the frontend confirms the handoff through `GET /auth/clerk/status` before
   loading protected data;
7. sign-out clears the Clerk session and returns to the public shell.

Provider failures, account-resolution errors, expired sessions, and network
errors must produce actionable retry or sign-out states. They must not expose
provider payloads, tokens, or account-enumeration details.

`CLERK_SECRET_KEY` is required in every environment, and
`CLERK_AUTHORIZED_PARTIES` in production ([environments.md](environments.md)).
The browser receives only the publishable key through generated runtime
configuration. Without it, the sign-in page
reports that sign-in is not configured.

Tests do not need Clerk: backend e2e tests replace `ClerkTokenVerifier` with a
fake, and frontend unit tests stub `ClerkService`. Browser journeys that sign
in use the development instance and `+clerk_test` addresses.


## Where it lives

| Concern | File |
| --- | --- |
| Token verification | [`backend/src/modules/common/auth/clerk-token-verifier.ts`](../backend/src/modules/common/auth/clerk-token-verifier.ts) |
| Account resolution and provisioning, Clerk invitations | [`backend/src/modules/common/auth/clerk-identity.service.ts`](../backend/src/modules/common/auth/clerk-identity.service.ts) |
| Sets `request.user` on every request | [`backend/src/common/middlewares/clerk-session.middleware.ts`](../backend/src/common/middlewares/clerk-session.middleware.ts) |
| Requires a resolved account | [`backend/src/common/guards/auth.guard.ts`](../backend/src/common/guards/auth.guard.ts) |
| Self-registration policy | [`backend/src/common/registration-policy.ts`](../backend/src/common/registration-policy.ts) |
| `GET /auth/clerk/status` | [`backend/src/modules/common/auth/auth.controller.ts`](../backend/src/modules/common/auth/auth.controller.ts) |
| Clerk JS lifecycle and invitation tickets | [`frontend/src/app/core/services/clerk.service.ts`](../frontend/src/app/core/services/clerk.service.ts) |
| Session handoff and sign-out | [`frontend/src/app/core/services/login.service.ts`](../frontend/src/app/core/services/login.service.ts) |
| Bearer token and 401 handling | [`frontend/src/app/core/interceptors/auth.interceptor.ts`](../frontend/src/app/core/interceptors/auth.interceptor.ts) |
| Sign-in page and invitation sign-up | [`frontend/src/app/pages/auth/`](../frontend/src/app/pages/auth/) |
