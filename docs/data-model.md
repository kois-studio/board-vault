# Data model and persistence

## Current persistence

The backend uses `@libsql/client` against Turso-hosted SQLite. `DatabaseService` creates the client during `OnModuleInit` from `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`, then exposes raw SQL helper methods to the rest of the backend. Numbered migration files are applied by `database/scripts/migrate.mjs`; `database/scripts/verify-empty-state.mjs` verifies the synchronized snapshot in disposable SQLite, but no automated CI migration gate or synthetic fixture set exists yet.

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

Migration [`0004-add-session-lifecycle.sql`](../database/migrations/0004-add-session-lifecycle.sql)
was applied to live Turso on 2026-08-16 after a fresh dump and disposable
SQLite verification. It adds `Meet.status`, `Meet.timezone`, nullable
`Meet.updatedAt`, and `idx_meet_status_date`; existing rows retain the
`completed`/`UTC` defaults. The nullable `updatedAt` column is intentional:
SQLite does not permit a non-constant default when adding a column, and the
canonical session write supplies it explicitly.

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
- `Meet`, `MeetAttendee`, `MeetGame`, and `MeetAccountGame`
- `FeatureFlags`
- `GameProposal`
- `RecommendationFeedback`

The backend source also has corresponding service/type/schema areas. The current product backlog identifies migration reproducibility, session transactions/API contracts, richer play events, and recommendation state as P0/P1 work.

## Ownership and consistency boundaries

- User, group, collection, invitation, review, notification, meet, and proposal mutations are exposed through many service/controller paths.
- The deprecated direct membership endpoint implements the accepted invite-only join boundary: the authenticated account must have a pending invitation for the target group, and the invitation is consumed after membership creation. V1 has owner/member roles; public groups, ownership transfer, and richer roles are deferred in ADR-0007.
- `DashboardService` creates a group and its owner membership through one Turso write transaction. The old dashboard meeting-creation mutation was removed; new sessions must use the canonical sessions module, while legacy meet reads and `MeetAccountGame` history writes remain during compatibility work.
- `Meet` remains the compatibility/session record. `MeetAttendee` stores participant RSVP/attendance state, `MeetGame` stores planned/played/skipped session-game state, and `MeetAccountGame` preserves account-to-play links for historical play lookup. The canonical completed-session write now persists the selected date, IANA timezone, attendees, played games, and participant links atomically. Scheduled-session creation now optionally persists planned games in the same transaction; completing or cancelling a session marks any remaining planned games as skipped atomically. Editing, RSVP mutation, richer event history, and broader lifecycle read models remain unfinished.
- Cache TTLs are declared in `cache.types.ts` and selected services invalidate keys, but cache ownership, stale-read behavior, disabled mode, and correctness tests are not documented.
- `RecommendationFeedback` stores the first lightweight product signal. The actor and attendee IDs are validated against group membership, and the game must be owned by at least one selected attendee before the feedback is accepted. Rich preference history and automated score weighting remain deferred.

## Repository reconciliation result

The exported deployed schema does not match every current SQL path or historical schema document:

The complete reconciliation, including evidence, compliance states, priorities,
and unresolved decisions, is maintained in the [database drift report](../database/drift-report.md).

- `database/schema/schema.sql` defines `Meet`, `MeetAttendee`, `MeetGame`, and `MeetAccountGame` after migration 0003.
- `backend/src/modules/common/database/database.service.ts` now queries the explicit session relations for meet details and group-meeting setup; the frontend attendee route still has no current backend controller.
- The deployed `Game` table has no `title` column. The application passes a title to `createGame()`, but the current insert path does not persist it in `Game`; titles are handled separately through translations. Frontend game contracts therefore treat the legacy `title` field as optional and use `titleTranslations` as the authoritative display source.
- The deployed `OwnedGame.purchaseDate` is `DATE` without the documented default, and deployed indexes differ from the historical schema document.
- Repository history shows the original `MeetAttendee` module was removed in commit `ef6e3d2`; migration 0003 deliberately reintroduced the relation as an additive, stateful session table rather than restoring the removed module unchanged.

These findings are now split between resolved schema alignment and remaining API/product work. The unresolved frontend attendee route, game-title contract, transaction boundaries, and session lifecycle rules must be handled before claiming the session domain complete.

## Data safety rules for future agents

- Treat `database/schema/schema.sql` as the current deployed baseline. Future schema changes require migrations.
- Do not manually edit production Turso tables for a feature task.
- Any schema change must first identify current deployment state, add a numbered migration strategy, define rollback/recovery expectations, and update the data-model workstream.
- Do not add a new session or recommendation entity without resolving the canonical state and ownership semantics in [todo/03-data-model-and-session-domain.md](../todo/03-data-model-and-session-domain.md).
- Keep user identity derived from the authenticated request and enforce ownership/group authorization at the server boundary.
- Clerk identity is an external subject; `Account.id` remains the local foreign-key identity. The bridge must be unique, nullable during rollout, and never inferred from a client-supplied numeric account ID.

## Required follow-up

1. Resolve the remaining API findings in the [DATA-001 drift report](../database/drift-report.md), especially the frontend attendee route and game-title contract.
2. Execute `DATA-003`: extend the session API from completed-session logging to the full scheduled/completed lifecycle, including planned-game editing and richer read models.
3. Execute `DATA-004`: apply the transaction policy to remaining multi-record mutations.
4. Execute `DATA-002`: add the migration runner and empty-state verification to CI, then rehearse a synthetic restore.
5. Add disposable integration data and backup/restore rehearsal before launch claims.

## Source evidence

- [Database workspace](../database/README.md)
- [Current schema export](../database/schema/schema.sql)
- [Database service](../backend/src/modules/common/database/database.service.ts)
- [Database module](../backend/src/modules/common/database/database.module.ts)
- [Database operations notes](../database/operations.md)
- [Session/data workstream](../todo/03-data-model-and-session-domain.md)
