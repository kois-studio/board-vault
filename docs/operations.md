# Operations, environments, and deployment

This document describes the repository-level workflow. Provider accounts,
production URLs, credentials, backups, deployment ownership, and recovery
contacts belong in private operator documentation and must not be committed.

## Schema rollout

Database changes are additive numbered migrations. Before applying a migration
to any shared or production database:

1. create an access-controlled backup;
2. run `node database/scripts/verify-empty-state.mjs` and
   `node database/scripts/verify-restore-rehearsal.mjs` locally;
3. inspect the target migration marker and confirm the pending sequence;
4. apply the migration with `database/scripts/migrate.mjs`; and
5. verify integrity, foreign keys, and the application health/readiness checks.

Do not edit a live database manually. Keep the rollback decision, recovery
owner, backup schedule, and provider-specific commands outside the public
repository.

The group-person feature has a reversible flag:
`BOARD_VAULT_GROUP_PEOPLE_ENABLED=false` disables the new routes while leaving
the migrated data in place. A deployment owner should define the rollback
window and compatibility target before enabling it in a shared environment.

## Local runtime

Use the committed [`backend/.env.example`](../backend/.env.example) as the
variable-name reference. Copy it to an ignored local `.env` and fill values
from a private development secret store. Never commit local environment files,
provider pulls, browser storage states, database dumps, or backup archives.

The backend requires the database URL, database auth token, and legacy JWT
secret. Email and Redis variables are required when those integrations are
enabled; local development can disable Redis explicitly. The frontend uses a
public Clerk publishable key only when the Clerk controls are enabled. Clerk
secret keys, database tokens, email keys, and Redis tokens are backend/operator
secrets and must never enter browser code.

For local development, use `npm run local:setup` to create an isolated SQLite
database with synthetic accounts and scenario data. Redis is disabled by
default, and the local email key is a nonfunctional placeholder. The API
exposes `/health` for liveness and `/health/ready` for coarse dependency/schema
readiness. Use the shared development services only for provider or
multi-developer integration checks.

## Configuration boundaries

The important variable names are:

- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `JWT_SECRET` for persistence
  and the legacy authentication fallback;
- `RESEND_API_KEY` and `NO_REPLY_EMAIL` for email delivery;
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and
  `UPSTASH_REDIS_REST_DISABLE` for cache/rate-limit storage;
- `CORS_ORIGINS` and `CLERK_AUTHORIZED_PARTIES` for exact trusted origins;
- `CLERK_SECRET_KEY` for backend identity verification;
- `CLERK_PUBLISHABLE_KEY`, `CLERK_AUTH_ENABLED`, and
  `BOARD_VAULT_SELF_REGISTRATION_ENABLED` for public frontend/runtime
  configuration; and
- `BOARD_VAULT_CLERK_INVITATION_REDIRECT_URL` for the invitation handoff.

Use exact origin allowlists. Do not use wildcard CORS with credentials, put a
backend secret in Angular environment files, or expose provider payloads in
logs or error responses.

## Verification baseline

Run the commands documented in [`AGENTS.md`](AGENTS.md) from the repository
root or the relevant package. The baseline includes backend/frontend clean
installs, builds, unit tests, no-mutation lint, the backend log-boundary audit,
the committed OpenAPI freshness check, frontend checks, and disposable
database migration/restore verification.

Authenticated browser journeys require disposable local identities and storage
state. Keep those files outside Git, use development provider tenants only,
and revoke temporary sessions after a run. Public browser checks must not
depend on production data or credentials.

## Provider degradation

When a deployment is unhealthy, check `/health` first and then
`/health/ready`. A database or schema readiness failure should stop traffic
until the reviewed migration/recovery plan is complete. Email failures should
surface a stable safe diagnostic code and a correlation ID, not recipient data
or provider payloads. Cache/rate-limit degradation must follow the explicit
configured fail-open/fail-closed policy.

Keep provider-specific incident timelines, deployment IDs, live counts, domain
configuration, backup locations, and recovery contacts in private operations
storage.
