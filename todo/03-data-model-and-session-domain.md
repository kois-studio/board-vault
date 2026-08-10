# Data model and session domain

## Current problem

The documented schema, database service, backend services, and frontend meeting flows do not consistently describe the same data model.

Known examples:

- `Game.title` is documented as required, while one creation path appears to omit it.
- Meeting code references `MeetAttendee` and `MeetGame`, while the documented schema emphasizes `MeetAccountGame`.
- There is no versioned migration history.
- Meeting creation does not consistently persist the selected date or related attendees/games.
- The confirmation concept is unfinished and appears to be abandoned in some frontend code.

Relevant areas:

- `database/schema/documented-schema.sql`
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
- user or guest identity;
- invitation/RSVP state;
- attendance state;
- response timestamp.

### Session game

Use separate semantics for:

- candidate/planned game;
- selected game;
- actually played game;
- play order;
- duration;
- winner or score, if supported;
- post-play group rating and feedback.

## Migration plan

1. Export and inspect the real deployed Turso schema.
2. Compare it with the documented schema and all SQL queries.
3. Decide the canonical names and compatibility strategy.
4. Add a migration runner and numbered migrations.
5. Add constraints, foreign keys, uniqueness rules, and indexes deliberately.
6. Backfill or remove legacy meeting tables.
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
