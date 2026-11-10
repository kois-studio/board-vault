# ADR: Private-beta registration with preserved account access

- **Status:** Accepted
- **Date:** 2026-09-03
- **Supersedes:** None
- **Superseded by:** None

## Context

Board Vault is validating its group-centered product loop. A visible sign-up
control is not sufficient protection when the API and identity provider also
have registration paths.

## Decision

Keep registration closed by default until the product owner explicitly enables
a public launch. The same policy applies to legacy registration, availability
probes, and automatic provisioning of unknown provider identities.

Existing verified accounts retain a controlled migration path. Account state,
provider configuration, rollout evidence, and recovery contacts are managed in
private operator documentation.

## Consequences

The public application does not create accounts accidentally during the beta.
A future launch must coordinate provider settings, frontend runtime
configuration, backend environment configuration, invitation policy, and
recovery checks.

## Update 2026-11-10: registration opens (#157)

The owner opened registration for the public launch, and
`BOARD_VAULT_SELF_REGISTRATION_ENABLED` is `true` in production. The flag
stays as the switch that pauses new accounts. While it is off, `/register`
says new accounts are paused, without beta or invitation wording.
Invitations are by username only (#277), so an invitation can no longer
create an account; someone new signs up on their own first. The public pages
may now be indexed by search engines.
