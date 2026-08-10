# Data model and persistence

## Current persistence

The backend uses `@libsql/client` against Turso-hosted SQLite. `DatabaseService` creates the client during `OnModuleInit` from `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`, then exposes raw SQL helper methods to the rest of the backend. The repository contains no migration directory, migration runner, schema snapshot generated from deployment, or disposable local database setup.

The intended schema is described in [database/schema/documented-schema.sql](../database/schema/documented-schema.sql) and represented partly by Zod schemas under `backend/src/common/schemas/`. That definition is a project artifact, not verified evidence of the deployed database. The first data task is to inspect the actual Turso schema and produce a drift report.

## Documented entities

The schema definition names these tables/entities:

- `Account`
- `Game`
- `GameTranslation`
- `OwnedGame`
- `WishlistedGame`
- `Tag`, `TagCategory`, and `GameTag`
- `UserGroup` and `GroupMembership`
- `Invitation`
- `Notification`
- `GameReview`
- `CollectionActivity`
- `Meet` and `MeetAccountGame`
- `FeatureFlags`
- `GameProposal`

The backend source also has corresponding service/type/schema areas. The current product backlog identifies schema drift, migration reproducibility, transactions, and a canonical session model as P0/P1 work.

## Ownership and consistency boundaries

- User, group, collection, invitation, review, notification, meet, and proposal mutations are exposed through many service/controller paths.
- A group creation flow in `DashboardService` creates the group, looks up its ID by name, and creates the owner membership as separate operations. The repository does not document atomicity or partial-failure behavior.
- `Meet`/`MeetAccountGame` currently support historical play lookup, but the canonical model for planned sessions, attendance, planned games, played games, cancellation, and completion is unresolved.
- Cache TTLs are declared in `cache.types.ts` and selected services invalidate keys, but cache ownership, stale-read behavior, disabled mode, and correctness tests are not documented.

## Data safety rules for future agents

- Treat `database/schema/documented-schema.sql` as schema intent until a live schema audit is completed.
- Do not manually edit production Turso tables for a feature task.
- Any schema change must first identify current deployment state, add a numbered migration strategy, define rollback/recovery expectations, and update the data-model workstream.
- Do not add a new session or recommendation entity without resolving the canonical state and ownership semantics in [todo/03-data-model-and-session-domain.md](../todo/03-data-model-and-session-domain.md).
- Keep user identity derived from the authenticated request and enforce ownership/group authorization at the server boundary.

## Required follow-up

1. Execute `DATA-001`: inspect deployed Turso schema and compare it to the source definition and queries.
2. Execute `DATA-002`: create numbered migrations and prove empty-state recreation.
3. Execute `DATA-003`: choose canonical session schema and distinguish planned from played state.
4. Execute `DATA-004`: define transactions and partial-failure behavior for multi-record mutations.
5. Add disposable integration data and backup/restore rehearsal before launch claims.

## Source evidence

- [Database workspace](../database/README.md)
- [Documented schema intent](../database/schema/documented-schema.sql)
- [Database service](../backend/src/modules/common/database/database.service.ts)
- [Database module](../backend/src/modules/common/database/database.module.ts)
- [Database operations notes](../database/operations.md)
- [Session/data workstream](../todo/03-data-model-and-session-domain.md)
