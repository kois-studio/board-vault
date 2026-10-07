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

Clerk Organizations are not used. Groups, memberships, and roles are
application-owned ([ADR-0007](adr/0007-group-membership-policy.md)), and every
group operation is authorized against local membership rows.

## Who owns what

Clerk owns the sign-in details: the username, email addresses, password, and
signed-in devices. Board Vault owns how people appear in groups: the display
name and the avatar ([ADR-0017](adr/0017-profile-and-sign-in-ownership.md)).
Settings → Account shows the username and email and opens Clerk's panel to
change them; Settings → Profile edits the display name and avatar and shows
the username read-only.

Clerk's first and last name are turned off in every instance, and the panel's
profile row (photo, name) and delete section are hidden with
`appearance.elements` in `ClerkService`. Self-deletion is off for every user
until the deletion flow is defined (#102). The instance-wide switch is
Dashboard-only: *User & authentication → Allow users to delete their
accounts*.

## Changes made in Clerk

Clerk tells the API about user changes through signed webhooks
([ADR-0013](adr/0013-clerk-user-lifecycle.md)). A verified primary email change
or a username change updates the linked account unless another account
already has that value; deleting the Clerk user soft-deletes the account, so it
can no longer sign in while group history keeps its references. The endpoint is off unless
`CLERK_WEBHOOK_SIGNING_SECRET` is set.

Sign-in never waits for a webhook: every request verifies the Clerk session
token itself. A delayed or failed delivery only delays the email, username, or deletion
sync; Clerk retries it, and failures stay visible in the Clerk dashboard's
webhook log.

## Where it lives

| Concern | File |
| --- | --- |
| Token verification | [`backend/src/modules/common/auth/clerk-token-verifier.ts`](../backend/src/modules/common/auth/clerk-token-verifier.ts) |
| Clerk webhooks (email and username sync, deletion) | [`backend/src/modules/common/auth/clerk-webhook.service.ts`](../backend/src/modules/common/auth/clerk-webhook.service.ts) |
| Account resolution and provisioning, Clerk invitations | [`backend/src/modules/common/auth/clerk-identity.service.ts`](../backend/src/modules/common/auth/clerk-identity.service.ts) |
| Sets `request.user` on every request | [`backend/src/common/middlewares/clerk-session.middleware.ts`](../backend/src/common/middlewares/clerk-session.middleware.ts) |
| Requires a resolved account | [`backend/src/common/guards/auth.guard.ts`](../backend/src/common/guards/auth.guard.ts) |
| Self-registration policy | [`backend/src/common/registration-policy.ts`](../backend/src/common/registration-policy.ts) |
| `GET /auth/clerk/status` | [`backend/src/modules/common/auth/auth.controller.ts`](../backend/src/modules/common/auth/auth.controller.ts) |
| Clerk JS lifecycle and invitation tickets | [`frontend/src/app/core/services/clerk.service.ts`](../frontend/src/app/core/services/clerk.service.ts) |
| Session handoff and sign-out | [`frontend/src/app/core/services/login.service.ts`](../frontend/src/app/core/services/login.service.ts) |
| Bearer token and 401 handling | [`frontend/src/app/core/interceptors/auth.interceptor.ts`](../frontend/src/app/core/interceptors/auth.interceptor.ts) |
| Sign-in page and invitation sign-up | [`frontend/src/app/pages/auth/`](../frontend/src/app/pages/auth/) |
