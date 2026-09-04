# ADR: Private-beta registration with preserved account access

- **Status:** Accepted
- **Date:** 2026-09-03
- **Supersedes:** None
- **Superseded by:** None

## Context

Board Vault is still validating its group-centered product loop. Public
registration had been enabled while the application was unfinished, creating
local accounts that were not necessarily connected to Clerk. The application
also has a legacy registration endpoint and Clerk can provision a local
account when an unknown verified identity first reaches a protected route.
Hiding a registration button would not protect either backend path.

The Turso database contains preserved domain history. Deleting unfamiliar
accounts can therefore remove associated groups, collections, or play history
through foreign-key cascades and is not an appropriate first response to an
unfinished product.

## Decision

Keep production in private-beta mode until the first-release completion
criteria are met.

- Clerk production uses restricted sign-up mode. Sign-in remains available.
- The backend uses the same fail-closed policy for legacy registration,
  availability probes, and unknown-Clerk-account provisioning.
- `BOARD_VAULT_SELF_REGISTRATION_ENABLED=true` is an explicit opt-in for a
  deliberate public-registration launch; development/test remain enabled by
  default unless overridden.
- Preserved local accounts may continue to sign in and migrate to Clerk when
  the primary email is verified and matches exactly.
- Legacy accounts with unverified email addresses cannot authenticate until
  verification succeeds.
- Registration emails are not treated as consent for product announcements.
  A future launch-notification list must be explicit opt-in.

## Account handling

Unknown existing accounts are preserved while their state and activity are
reviewed. A read-only Turso check on 2026-09-04 confirmed that the three
investigated legacy rows have no Clerk identity: account `#14` is verified and
has one owned game, one group membership, and collection activity; account
`#15` is verified and inactive; account `#16` is unverified and inactive but
younger than the 60-day retention threshold. None is deleted. An unverified
account may be soft-deleted after 60 days only when it is a legacy account with
no Clerk identity and no collection, group, invitation, session, review,
notification, proposal, recommendation, owned-game, or wishlist records. The
repeatable `database/scripts/prune-unverified-accounts.mjs` tool is dry-run by
default; `--apply` is required to perform the soft delete. It never hard
deletes the account row or cascades domain history.

## Consequences

- Random visitors cannot create usable Board Vault accounts through the normal
  UI or either backend registration/provisioning path.
- Existing friends with preserved accounts retain a migration path.
- A future invite workflow must create or authorize the Clerk identity before
  the user reaches Board Vault; unrestricted Clerk sign-up must not be restored
  casually.
- Public launch requires coordinated Clerk configuration, frontend runtime
  configuration, backend environment configuration, and deployment checks.

## Alternatives considered

- **Hide the sign-up button only:** rejected because direct API calls and Clerk
  provisioning would remain open.
- **Delete all unfamiliar accounts:** rejected because unfamiliar does not mean
  abusive and local rows can own historical domain data.
- **Allow public sign-up with an “in progress” banner:** rejected because it
  creates an expectation and an account lifecycle the product cannot yet serve.
