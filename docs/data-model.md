# Data model and persistence

## Current persistence

The backend uses `@libsql/client` against Turso-hosted SQLite. `DatabaseService` creates the client during `OnModuleInit` from `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`, then exposes raw SQL helper methods to the rest of the backend. The repository contains numbered migration files but no migration runner, disposable local database setup, or automated migration gate.

The current deployed baseline is captured in [database/schema/schema.sql](../database/schema/schema.sql), based on the owner-supplied Turso export and the verified 2026-08-12 identity migration. It is represented partly by Zod schemas under `backend/src/common/schemas/`. The first data task is repository reconciliation against this baseline, not deployment discovery.

The live baseline now contains nullable `Account.clerkUserId`. Migration
[`0001-add-clerk-user-id.sql`](../database/migrations/0001-add-clerk-user-id.sql)
was applied to live Turso on 2026-08-12 after passing against a restored backup
copy. One existing account has now been linked through the verified Clerk
boundary. Verified Clerk sessions can now use protected API routes and new
identities can be provisioned into the local account model; the legacy
JWT/password path remains active for the rollout and recovery window.

Migration `0002-add-auth-token-expiry.sql` is an applied additive change. It
adds UTC epoch-second expiry columns for legacy verification and password-reset
tokens. Live Turso was backed up, migrated, checked for integrity and foreign
key violations, and re-exported on 2026-08-16; no existing token rows had an
expiry-bearing token at verification time. The application still fails closed
when those columns are NULL.
The migration is tracked in
[`database/migrations/0002-add-auth-token-expiry.sql`](../database/migrations/0002-add-auth-token-expiry.sql).

## Current deployed entities

The schema snapshot names these tables/entities:

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
- The deprecated direct membership endpoint currently implements an invite-only join boundary: the authenticated account must have a pending invitation for the target group, and the invitation is consumed after membership creation. The broader product decision on self-join versus invite-only groups remains open in the product workstream.
- A group creation flow in `DashboardService` creates the group, looks up its ID by name, and creates the owner membership as separate operations. The repository does not document atomicity or partial-failure behavior.
- `Meet`/`MeetAccountGame` currently support historical play lookup, but the canonical model for planned sessions, attendance, planned games, played games, cancellation, and completion is unresolved.
- Cache TTLs are declared in `cache.types.ts` and selected services invalidate keys, but cache ownership, stale-read behavior, disabled mode, and correctness tests are not documented.

## Repository reconciliation result

The exported deployed schema does not match every current SQL path or historical schema document:

The complete reconciliation, including evidence, compliance states, priorities,
and unresolved decisions, is maintained in the [database drift report](../database/drift-report.md).

- `database/schema/schema.sql` defines `Meet` and `MeetAccountGame`, but does not define `MeetAttendee` or `MeetGame`.
- `backend/src/modules/common/database/database.service.ts` still queries `MeetAttendee` and `MeetGame` in meet details and group-meeting setup.
- The deployed `Game` table has no `title` column. The application passes a title to `createGame()`, but the current insert path does not persist it in `Game`; titles are handled separately through translations in later code.
- The deployed `OwnedGame.purchaseDate` is `DATE` without the documented default, and deployed indexes differ from the historical schema document.
- Repository history shows `MeetAttendee` was removed in commit `ef6e3d2`, while later code still contains references to it; this is evidence of stale code, not evidence that the table exists in deployment.

These are actionable code/schema drift findings. They must be resolved or explicitly retired before migration work or session-domain implementation.

## Data safety rules for future agents

- Treat `database/schema/schema.sql` as the current deployed baseline. Future schema changes require migrations.
- Do not manually edit production Turso tables for a feature task.
- Any schema change must first identify current deployment state, add a numbered migration strategy, define rollback/recovery expectations, and update the data-model workstream.
- Do not add a new session or recommendation entity without resolving the canonical state and ownership semantics in [todo/03-data-model-and-session-domain.md](../todo/03-data-model-and-session-domain.md).
- Keep user identity derived from the authenticated request and enforce ownership/group authorization at the server boundary.
- Clerk identity is an external subject; `Account.id` remains the local foreign-key identity. The bridge must be unique, nullable during rollout, and never inferred from a client-supplied numeric account ID.

## Required follow-up

1. Resolve the findings in the [DATA-001 drift report](../database/drift-report.md), beginning with the canonical session model and stale meeting paths.
2. Execute `DATA-002`: create numbered migrations and prove empty-state recreation.
3. Execute `DATA-003`: choose canonical session schema and distinguish planned from played state.
4. Execute `DATA-004`: define transactions and partial-failure behavior for multi-record mutations.
5. Add disposable integration data and backup/restore rehearsal before launch claims.

## Source evidence

- [Database workspace](../database/README.md)
- [Current schema export](../database/schema/schema.sql)
- [Database service](../backend/src/modules/common/database/database.service.ts)
- [Database module](../backend/src/modules/common/database/database.module.ts)
- [Database operations notes](../database/operations.md)
- [Session/data workstream](../todo/03-data-model-and-session-domain.md)
