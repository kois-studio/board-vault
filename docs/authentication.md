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

`CLERK_SECRET_KEY` and `CLERK_AUTHORIZED_PARTIES` are required backend
configuration in every environment. The browser receives only the publishable
key through generated runtime configuration. Without it, the sign-in page
reports that sign-in is not configured.

Tests do not need Clerk: backend e2e tests replace `ClerkTokenVerifier` with a
fake, and frontend unit tests stub `ClerkService`. Browser journeys that sign
in use the development instance and `+clerk_test` addresses.
