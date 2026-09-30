# ADR: Clerk-only authentication

- **Status:** Accepted
- **Date:** 2026-09-30
- **Supersedes:** 0005; the legacy-path clause of 0004; the opt-in Clerk and
  legacy-session clauses of 0011
- **Superseded by:** None

## Context

ADR-0004 moved identity to Clerk while keeping a legacy password/JWT path for
a migration window. Every active production account is now linked to a Clerk
user, so the migration window is over. Two sign-in paths doubled the
authentication surface: password hashes, verification and reset tokens, a
JWT secret, and a transactional-email dependency existed only for the legacy
path.

## Decision

Clerk is the only way to sign in to Board Vault.

- The backend accepts only Clerk session tokens. It verifies each Bearer token
  with `CLERK_SECRET_KEY` and `CLERK_AUTHORIZED_PARTIES`, which are required in
  every environment.
- The local `Account` row remains the profile and authorization boundary
  (ADR-0004). Collections, groups, and history keep their account foreign keys.
- A Clerk user reaches an account in one of two ways: the account is already
  linked by `clerkUserId`, or a new account is provisioned for a Clerk user
  with a verified primary email under the registration policy (ADR-0008).
- The backend never links a Clerk user to an existing account by email alone.
  If the verified email already belongs to an unlinked account, the request
  fails with `409 ACCOUNT_EMAIL_CONFLICT`, and an operator resolves it.
- `Account` stores no credentials. Migration `0015` drops the password,
  email-verification, and password-reset columns. Password storage, email
  verification, and password reset belong to Clerk.
- The legacy endpoints (`/auth/login`, `/auth/register`, availability checks,
  email verification, and password reset) are removed. The only
  authentication endpoint is `GET /auth/clerk/status`.
- Local development uses the development Clerk instance. Fixture accounts use
  `+clerk_test` addresses and are linked to development Clerk users.

## Consequences

- There is one session model to secure, test, and document. The JWT secret and
  Resend dependency are no longer needed.
- A Clerk outage prevents sign-in. The public shell still loads and explains
  the outage.
- Contributors need the development Clerk keys to sign in locally. Unit and
  backend e2e tests replace the token verifier with a fake and need no keys.
- Dropping the credential columns cannot be undone with data. Rolling back
  `0015` restores empty columns only; the pre-migration backup is the recovery
  point for the old hashes.
- Future account-linking features (for example, merging a duplicate account)
  need an explicit, audited operator or user flow, not an automatic email match.
