# ADR: Private-beta registration with preserved account access

- **Status:** Accepted
- **Date:** 2026-09-03

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
