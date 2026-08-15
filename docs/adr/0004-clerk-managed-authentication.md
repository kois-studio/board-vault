# ADR: Clerk-managed authentication with preserved local accounts

- **Status:** Accepted; rollout in progress
- **Date:** 2026-08-12
- **Supersedes:** None
- **Superseded by:** None

## Context

Board Vault currently owns passwords, email verification, password reset, and
JWT session issuance in the backend. The application is unfinished, but the
Turso database contains domain history worth preserving, including games and
meet/play records. Deleting `Account` rows would cascade into that history.

Clerk provides the intended authentication experience and manages email,
username, and configured social sign-in providers. The live database now has
the additive Clerk identity column, and one existing account has been linked
through the staged boundary.

## Decision

Use Clerk as the authentication provider and retain the local `Account` table
as the Board Vault domain-profile and authorization record during migration.

- Add nullable, uniquely indexed `Account.clerkUserId` through a numbered
  migration.
- Verify Clerk bearer tokens in NestJS with Clerk's backend SDK.
- Resolve a verified Clerk subject to an existing local account. If it is not
  already linked, permit a one-time exact match against Clerk's primary email
  and attach the Clerk subject. If no local account exists, provision a local
  domain account with an unusable legacy password, verified email state, and a
  generated safe profile identity.
- Do not delete historical accounts or copy Clerk administrative claims into
  local authorization state. Local `isAdmin` remains authoritative until a
  separate authorization decision changes it.
- Keep the legacy password/JWT path during the rollout and recovery window.
  Remove it only after migration, account-link verification, frontend cutover,
  and recovery checks are complete.

The Clerk implementation exposes `/auth/clerk/status` and resolves verified
Clerk sessions into the existing `request.user` shape before the compatibility
JWT guard. Protected routes therefore accept Clerk bearer sessions while the
legacy password/JWT path remains available during rollout.

## Consequences

- Historical `Account` foreign keys and domain records remain intact.
- Clerk secrets are required only by the backend; the browser receives only
  the publishable key.
- Existing accounts are linked by exact primary email; new Clerk identities are
  provisioned on their first verified API session.
- The migration is additive and has changed the live identity boundary; the
  preserved backup validation and post-migration row-count check are recorded.
- The old auth implementation remains maintenance burden until cutover is
  completed.

## Alternatives considered

- **Delete local accounts and start over:** rejected because account deletion
  cascades into historical domain data.
- **Keep manual authentication:** rejected because it duplicates security-
  sensitive identity lifecycle work that Clerk can own.
- **Use Clerk as the only account record:** rejected for now because local
  profile, admin, and domain foreign-key continuity still matters.

## Rollout evidence and open work

- Clerk development application is created and linked locally.
- Frontend and backend SDKs are installed; the frontend adapter lazy-loads the
  Clerk bundle.
- The development frontend rollout toggle is `clerkAuthEnabled: true`; the
  production environment remains disabled until the production publishable
  key, backend secret, authorized parties, deployment settings, and rollback
  evidence are supplied.
- [Migration 0001](../../database/migrations/0001-add-clerk-user-id.sql) has
  been applied to live Turso and passed against the preserved SQLite backup
  copy, retaining 15 accounts, 13 meets, and 101 meet/game links.
- Live Turso currently reports one linked Clerk account. Protected-route
  middleware, Clerk-aware frontend token transport, new-account provisioning,
  and production configuration fail-closed checks are implemented locally but
  have not yet been verified against the production deployment.
- The original backup remains outside the repository and must not be committed.
- Production Clerk instance/domain configuration, deployed-origin checks,
  recovery checks, and legacy-auth removal remain rollout tasks in
  [docs/TODO.md](../TODO.md).
