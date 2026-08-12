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
through the staged boundary; the broader frontend remains on the legacy path.

## Decision

Use Clerk as the authentication provider and retain the local `Account` table
as the Board Vault domain-profile and authorization record during migration.

- Add nullable, uniquely indexed `Account.clerkUserId` through a numbered
  migration.
- Verify Clerk bearer tokens in NestJS with Clerk's backend SDK.
- Resolve a verified Clerk subject to an existing local account. If it is not
  already linked, permit a one-time exact match against Clerk's primary email
  and attach the Clerk subject.
- Do not silently create a local account, delete historical accounts, or copy
  Clerk administrative claims into local authorization state. Local `isAdmin`
  remains authoritative until a separate authorization decision changes it.
- Keep the legacy password/JWT path during the rollout and recovery window.
  Remove it only after migration, account-link verification, frontend cutover,
  and recovery checks are complete.

The first implementation exposes an isolated `/auth/clerk/status` boundary.
It does not replace the existing JWT guards yet.

## Consequences

- Historical `Account` foreign keys and domain records remain intact.
- Clerk secrets are required only by the backend; the browser receives only
  the publishable key.
- Existing accounts need an exact-email link or an explicitly designed manual
  provisioning path before they can use the new provider.
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
- The development frontend rollout toggle is `clerkAuthEnabled: true` for the
  staged sign-in controls; the production environment remains on the legacy
  path until cutover controls and rollback evidence are complete.
- [Migration 0001](../../database/migrations/0001-add-clerk-user-id.sql) has
  been applied to live Turso and passed against the preserved SQLite backup
  copy, retaining 15 accounts, 13 meets, and 101 meet/game links.
- Live Turso currently reports one linked Clerk account; broader frontend
  cutover is still disabled outside the development verification path.
- The original backup remains outside the repository and must not be committed.
- Broader account-link coverage, route/interceptor cutover, recovery checks,
  and legacy-auth removal remain rollout tasks in [docs/TODO.md](../TODO.md).
