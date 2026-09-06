# Board Vault project documentation

This directory is the canonical operating manual for AI developer agents working in Board Vault. It describes the committed repository baseline as reviewed on 2026-09-06, including the Clerk session bridge, private-beta registration policy, local account provisioning, the first verified account link, the applied legacy-token lifecycle migration, canonical session and per-game participant recording, explainable recommendation decision lenses, lightweight owner-controlled group acquisition decisions, and the reviewed legacy group, membership, notification, meet, collection, admin reviewer, global-user-list, deleted-account JWT, database-log, email-log, cache-log, auth-log, service-log redaction, authentication path/query validation, bounded request DTOs, CORS, and authentication rate-limit boundaries. The application is an existing Angular/NestJS foundation, not a launch-ready implementation.

## Start here

1. Read [AGENTS.md](AGENTS.md) for safe working rules, source-of-truth boundaries, and verification commands.
2. Read [project-standards.yml](project-standards.yml) for the pinned standards version and compliance states.
3. Read [architecture.md](architecture.md), then the relevant [API](api.md), [data model](data-model.md), [operations](operations.md), or [security](security.md) document.
4. Check [TODO.md](TODO.md) for standards/readiness blockers, then claim product work only through the [agent task board](../todo/06-agent-task-board.md).

## Maintained project documentation

### Local agent and standards contract

- [Root agent redirect](../AGENTS.md)
- [Agent instructions](AGENTS.md)
- [Standards contract](project-standards.yml)
- [Effective local rules](standards.md)
- [Readiness TODOs](TODO.md)
- [Implementation TODO inventory](implementation-todo.md)
- [Frontend UI/UX review register](review-uiux.md)
- [ADR index](adr/README.md)
- [ADR 0001 — Group-first product context](adr/0001-group-first-product-context.md)
- [ADR 0002 — Deterministic recommendations](adr/0002-deterministic-explainable-recommendations.md) — Accepted selected-attendee ownership policy
- [ADR 0003 — Session domain](adr/0003-session-as-first-class-domain.md)
- [ADR 0004 — Clerk-managed authentication](adr/0004-clerk-managed-authentication.md)
- [ADR 0005 — Verification and password-reset token lifecycle](adr/0005-auth-token-lifecycle.md)
- [ADR 0006 — Public nested-user response boundary](adr/0006-user-response-privacy.md)
- [ADR 0007 — Invite-only group membership policy](adr/0007-group-membership-policy.md)

### Current-state architecture and boundaries

- [System architecture](architecture.md)
- [API surface and contracts](api.md)
- [Data model and persistence](data-model.md)
- [Security boundaries](security.md)
- [Operations and environments](operations.md)
- [Testing and verification](testing.md)

### Existing project documentation and source-specific notes

- [Root README](../README.md)
- [Backend README](../backend/README.md) — Nest starter text; use [operations.md](operations.md) for verified commands.
- [Frontend README](../frontend/README.md) — Angular starter text; use [operations.md](operations.md) for verified commands.
- [Backend docs index](../backend/docs/index.md)
- [Database operations notes](../database/operations.md)
- [Database drift report](../database/drift-report.md)
- [Backend style guide](../backend/docs/style-guide.md)
- [Backend roadmap: why](../backend/docs/roadmap/1-why.md)
- [Backend roadmap: planification](../backend/docs/roadmap/2-planification.md)
- [Backend guard notes](../backend/src/common/guards/README.md)
- [Backend schema notes](../backend/src/common/schemas/README.md)
- [Database service notes](../backend/src/modules/common/database/database.service.md)
- [Collection activity module notes](../backend/src/modules/core/collection-activity/collection-activity.module.md)

### Database workspace and product direction

- [Database workspace](../database/README.md)
- [Current database schema](../database/schema/schema.sql)
- [Database operations notes](../database/operations.md)
- [Product definition and direction](../todo/01-product-direction.md)

### Product backlog and agent coordination

The `/todo/` package is the source of truth for product direction and execution coordination. It is not proof that a feature exists.

`docs/TODO.md` is an active burn-down list, not a completion archive. A TODO
item is removed only after its acceptance criteria and verification evidence are
complete. The implementation truth, decision records, and task-board history
remain in the maintained documents linked above.

- [TODO system](../todo/README.md)
- [Master brief](../todo/00-master-brief.md)
- [Product direction](../todo/01-product-direction.md)
- [Security and authorization workstream](../todo/02-security-and-authorization.md)
- [Data model and session domain workstream](../todo/03-data-model-and-session-domain.md)
- [Core product loop workstream](../todo/04-core-product-loop.md)
- [Engineering quality and delivery workstream](../todo/05-engineering-quality-and-delivery.md)
- [Agent task board](../todo/06-agent-task-board.md)
- [Product truth and launch readiness](../todo/07-product-truth-and-launch-readiness.md)

## Documentation ownership

- Current implementation facts belong in this `docs/` package or in the source/configuration they describe.
- Product intent, sequencing, and task ownership belong in `/todo/`.
- [database/schema/schema.sql](../database/schema/schema.sql) is the current Turso schema export; repository code/schema drift is documented in [data-model.md](data-model.md).
- Durable architectural or policy decisions belong in [docs/adr/](adr/README.md).
- When code changes a documented boundary, update the affected document in the same change.
