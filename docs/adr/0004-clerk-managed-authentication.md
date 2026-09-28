# ADR: Provider-managed authentication with preserved local accounts

- **Status:** Accepted
- **Date:** 2026-08-12

## Context

Board Vault has a legacy password/JWT path and a domain account record that is
referenced by collections, groups, and session history. Replacing that record
with a provider-only identity would make data ownership and authorization
harder to preserve.

## Decision

Use a managed identity provider while retaining the local `Account` record as
the Board Vault profile and authorization boundary during migration.

- Store only the provider subject needed to link a verified identity.
- Accept a link only after the provider reports a verified primary email and
  it matches the existing account under the documented migration policy.
- Keep local authorization state authoritative; provider claims do not grant
  administrator or group access by themselves.
- Keep the legacy path only for the deliberate migration and recovery window.
- Send provider secret keys only to the backend. Browser code may receive a
  publishable configuration value through runtime configuration.

## Consequences

Existing domain history keeps stable local foreign keys, while identity
operations can move to a specialized provider. The migration requires private
backup, rollback, and account-link verification procedures that are not stored
in this public repository.
