# Database workspace

This directory owns database-specific artifacts and tooling for Board Vault. It is intentionally separate from `/docs/`, which contains the engineering-standards handoff, current architecture, compliance contract, and agent instructions.

## Current status

- The application uses Turso/libSQL SQLite through `backend/src/modules/common/database/database.service.ts`.
- [schema/documented-schema.sql](schema/documented-schema.sql) is the historical documented schema intent migrated from the former `context/` folder. It has not been verified against the deployed Turso database and MUST NOT be treated as a migration or applied directly without review.
- There is currently no migration runner, versioned migration history, disposable test database, fixture set, Docker test environment, or restore rehearsal.
- The first database work is `DATA-001`: inspect the deployed schema and publish a code/schema drift report. Follow with migrations and the canonical session model.

## Planned layout

```text
database/
├── README.md
├── schema/       # documented baseline and future schema artifacts
├── migrations/   # future numbered, reviewable migrations
├── fixtures/     # synthetic test data; never production exports
├── docker/       # future disposable database/test infrastructure
└── scripts/      # future validation, dump, restore, and fixture tooling
```

Only `schema/` is populated today. Create the other directories when their first artifact is needed; do not add empty placeholders.

## Source-of-truth boundaries

- Domain semantics, persistence risks, and migration requirements: [docs/data-model.md](../docs/data-model.md).
- Current backend persistence implementation: [DatabaseService](../backend/src/modules/common/database/database.service.ts).
- Schema intent: [schema/documented-schema.sql](schema/documented-schema.sql), until a verified migration baseline replaces it.
- Product/session decisions: [todo/03-data-model-and-session-domain.md](../todo/03-data-model-and-session-domain.md) and proposed [ADR-0003](../docs/adr/0003-session-as-first-class-domain.md).
- API behavior and transaction expectations: [docs/api.md](../docs/api.md).

## Rules for future database work

- Never commit real credentials, production dumps, or personal data. Fixtures MUST be synthetic and reviewable.
- Do not edit the live Turso database manually for feature development. Add a migration and document rollout/recovery behavior.
- Every migration MUST be numbered, forward-executable from the documented baseline, tested from an empty database, and assessed against a representative existing database before rollout.
- Schema changes MUST identify affected queries, constraints, indexes, API contracts, authorization boundaries, and rollback or compensation behavior.
- API end-to-end tests belong with the backend test suite; this directory should contain database setup, fixtures, migrations, and database-specific verification helpers.

## Future test environment

The intended future setup is a disposable SQLite/libSQL environment with synthetic fixtures for API integration and e2e tests. The exact Docker approach remains undecided because the application currently targets Turso/libSQL and no local database adapter exists. Record that decision in an ADR before introducing infrastructure.

## Related documentation

- [Database operations notes](operations.md)
- [Data model documentation](../docs/data-model.md)
- [Data/session workstream](../todo/03-data-model-and-session-domain.md)
- [Readiness TODOs](../docs/TODO.md)
