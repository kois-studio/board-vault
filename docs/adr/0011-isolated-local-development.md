# ADR: Isolated local development and shared integration

- **Status:** Accepted
- **Date:** 2026-09-28
- **Supersedes:** None
- **Superseded by:** None

## Context

Board Vault is developed by a small team and has production, shared development
services, and individual developer checkouts. Routine work must not require
production access or make one developer's reset affect another developer.
The repository already uses libSQL, versioned migrations, disposable SQLite
verification, Clerk during an identity migration, and optional Upstash Redis.

## Decision

- Routine development uses a per-checkout SQLite file and synthetic fixture
  data. The local reset command has a fixed local target and cannot select a
  remote database.
- The API supports a `file:` database URL without a database auth token.
- Fixtures use reserved identities and are not linked to environment-specific
  Clerk subject IDs. Clerk development authentication is opt-in for work that
  needs to test that integration. The legacy compatibility session remains
  supported during the accepted migration window.
- Shared Clerk/Turso development services are an integration environment,
  not the default development database. Their destructive refresh is an
  explicit owner operation and is not part of local setup.
- Redis remains disabled in the normal local template. The current Upstash
  REST client is not interchangeable with a native Redis container.
- Production credentials and data are not part of contributor setup.

## Consequences

- Contributors can recreate a useful local environment without shared-service
  access or production credentials.
- Local state and resets are isolated by checkout, supporting parallel work.
- Provider-specific, multi-user integration still requires the approved shared
  development environment.
- Shared integration data can drift and must be deliberately refreshed by its
  operator; no contributor should assume it is disposable personal state.
- A future local native Redis adapter or Clerk fixture-management system needs
  separate evidence and review before becoming part of the default workflow.

## Alternatives considered

- **Use shared Turso for normal development:** simple initially, but resets,
  fixture writes, and schema work interfere across contributors.
- **Use production-inspired user data locally:** adds unnecessary privacy risk;
  synthetic account and group data provide deterministic scenarios.
- **Add Redis in Docker immediately:** the current Upstash REST client expects
  HTTP REST endpoints, so a standard Redis TCP service would not work.
- **Create a Clerk identity for every fixture:** adds provider API setup and
  environment-specific lifecycle work before the local workflow needs it.
