# Data model and session domain

## Current problem

The documented schema, database service, backend services, and frontend meeting flows do not consistently describe the same data model.

Known examples:

- `Game.title` is documented as required, while one creation path appears to omit it.
- Meeting code references `MeetAttendee` and `MeetGame`, while the documented schema emphasizes `MeetAccountGame`.
- There is no versioned migration history.
- Meeting creation does not consistently persist the selected date or related attendees/games.
- The confirmation concept is unfinished and appears to be abandoned in some frontend code.

The v1 decision is recorded in [ADR-0003](../docs/adr/0003-session-as-first-class-domain.md): keep `Meet` as the compatibility/session record, add explicit `MeetAttendee` and `MeetGame` relations, and preserve `MeetAccountGame` as the account-to-play relation.

### Group-person extension

The session participant model now also supports group-scoped `GroupPerson`
identities. A group may represent unregistered people without synthetic
accounts; `MeetPersonAttendee` and `MeetPersonGame` preserve their attendance
and per-game participation. A later reviewed claim links the existing
`GroupPerson` to an account without rewriting history. RSVP remains limited to
linked real accounts, while organizers record placeholder attendance.

Relevant areas:

- `database/schema/schema.sql` (current Turso export)
- `backend/src/modules/common/database/database.service.ts`
- `backend/src/modules/features/play/play.service.ts`
- meeting-related frontend pages and services.

## Canonical domain model

The target model should distinguish catalog data, ownership, group membership, scheduled sessions, and completed plays.

### Game

Catalog entity:

- stable ID;
- title;
- image and source metadata;
- minimum/maximum players;
- estimated duration;
- complexity or weight, if available;
- mechanics/tags;
- catalog provenance.

### Collection item

User ownership entity:

- user ID;
- game ID;
- ownership status;
- purchase price and currency, if retained;
- condition/location, if needed;
- visibility;
- added timestamp.

### Group

- owner/creator;
- members and roles;
- invitation state;
- group preferences;
- created/archived state.

### Session

- group ID;
- organizer ID;
- status: draft, scheduled, active, completed, cancelled;
- start time;
- timezone;
- optional end time or duration;
- optional location;
- notes.

### Session attendance

- session ID;
- account identity for v1;
- RSVP state: pending, accepted, or declined;
- attendance state: unknown, attended, or absent;
- response timestamp and row creation timestamp.

### Session game

Use separate semantics for:

- planned, played, or skipped game state;
- optional play order;
- duration;
- winner or score, if supported;
- post-play group rating and feedback.

For v1, `MeetGame` stores the planned/played/skipped state and `MeetAccountGame`
stores which accounts participated in a game. Rich play-event details remain
deferred.

## Migration plan

1. Treat the owner-confirmed documented schema as the current deployed baseline.
2. Compare it with all SQL queries and publish a code/schema drift report. **Complete for the current baseline:** see [`database/drift-report.md`](../database/drift-report.md); unresolved findings remain deliberately open.
3. **Complete for v1:** accept the `Meet` compatibility mapping and separate
   attendance, session-game, and play-participant relations in ADR-0003.
4. Add a migration runner and numbered migrations.
5. Add constraints, foreign keys, uniqueness rules, and indexes deliberately.
6. Backfill the additive relations; do not delete `MeetAccountGame` until a
   richer play-event migration exists.
7. Update services and frontend contracts.
8. Test migrations from an empty database and from a representative existing database.

Do not delete legacy tables until data has been mapped and a rollback strategy exists.

## Transaction requirements

These operations must be atomic or have explicit compensation:

- create group plus initial membership;
- create session plus attendees and planned games;
- complete session plus actual played games;
- approve game proposal plus catalog, translation, tag, proposal, and notification changes;
- replace a collection’s game set.

## Definition of done

- One canonical session model is documented and implemented.
- The schema can be recreated from an empty database.
- Existing data can be migrated or explicitly rejected with a report.
- Session creation and completion are transactional.
- Foreign keys, unique constraints, and indexes cover the core queries.
- Backend integration tests run against the canonical schema.
