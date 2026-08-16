# Database workspace

This directory owns database-specific artifacts and tooling for Board Vault. It is intentionally separate from `/docs/`, which contains the engineering-standards handoff, current architecture, compliance contract, and agent instructions.

## Current status

- The application uses Turso/libSQL SQLite through `backend/src/modules/common/database/database.service.ts`.
- [schema/schema.sql](schema/schema.sql) is the current live Turso schema snapshot verified on 2026-08-16. It is an observed snapshot, not a migration, and MUST NOT be applied directly to another environment without review.
- The initial repository reconciliation found stale `MeetAttendee` and `MeetGame` paths. Migration 0003 now defines those additive session relations and the backend detail/setup queries are aligned to them. The deployed `Game` table still has no `title` column; the application passes a title but the current insert path does not persist it in `Game`.
- The detailed, evidence-backed reconciliation is recorded in [drift-report.md](drift-report.md). It separates confirmed schema gaps from unresolved session/product decisions and does not authorize live schema changes.
- There is currently no migration runner, disposable test database, fixture set, Docker test environment, or restore rehearsal.
- Migration `0001-add-clerk-user-id.sql` has been applied to live Turso and verified without changing historical row counts. It adds the Clerk identity bridge; one existing account has been linked through the verified local Clerk flow, and new local accounts can now be provisioned from verified Clerk identities by the backend.
- Migration `0002-add-auth-token-expiry.sql` was applied to live Turso on 2026-08-16 after a fresh local dump. Integrity and foreign-key checks passed, both expiry columns are present, and the schema snapshot was re-exported. No existing verification or reset tokens had expiry-bearing rows at verification time.
- Migration `0003-add-session-relations.sql` was applied to live Turso on 2026-08-16 after a fresh local dump. It added `MeetAttendee` and `MeetGame`, backfilled 63 attendee rows and 22 session-game rows from the 101 preserved `MeetAccountGame` play links, and passed integrity/foreign-key checks.
- Migration `0004-add-session-lifecycle.sql` was applied to live Turso on 2026-08-16 after a fresh local dump and disposable SQLite verification. It added `Meet.status`, `Meet.timezone`, nullable `Meet.updatedAt`, and `idx_meet_status_date`; preserved row counts and integrity checks passed.
- `DATA-001` is now in review with its evidence in [drift-report.md](drift-report.md). The canonical v1 session relation decision and migration are recorded; completed and scheduled session writes plus lifecycle transitions are now implemented, while migration execution/recreation (`DATA-002`) and richer lifecycle read models remain.

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

`schema/` and `migrations/` are populated today. Create the other directories when their first artifact is needed; do not add empty placeholders.

## Source-of-truth boundaries

- Domain semantics, persistence risks, and migration requirements: [docs/data-model.md](../docs/data-model.md).
- Current backend persistence implementation: [DatabaseService](../backend/src/modules/common/database/database.service.ts).
- Current schema snapshot: [schema/schema.sql](schema/schema.sql). Future migrations will become the reproducible source of truth.
- Applied auth-token migration: [migrations/0002-add-auth-token-expiry.sql](migrations/0002-add-auth-token-expiry.sql). The live schema claim includes its two nullable UTC epoch-second columns; the migration runner and repeatable empty-state recreation are still missing.
- Applied session migration: [migrations/0003-add-session-relations.sql](migrations/0003-add-session-relations.sql). It is additive and preserves `MeetAccountGame`; the migration runner and repeatable empty-state recreation are still missing.
- Applied session lifecycle migration: [migrations/0004-add-session-lifecycle.sql](migrations/0004-add-session-lifecycle.sql). `updatedAt` is nullable because SQLite disallows non-constant defaults in `ALTER TABLE`; application writes set it explicitly.
- Product/session decisions: [todo/03-data-model-and-session-domain.md](../todo/03-data-model-and-session-domain.md) and accepted [ADR-0003](../docs/adr/0003-session-as-first-class-domain.md).
- Authentication identity decision: [ADR-0004](../docs/adr/0004-clerk-managed-authentication.md).
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
