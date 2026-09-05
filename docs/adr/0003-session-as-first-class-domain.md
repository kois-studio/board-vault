# ADR: Session as a first-class domain concept

- **Status:** Accepted
- **Date:** 2026-08-16
- **Supersedes:** None
- **Superseded by:** None

## Context

The current implementation uses `Meet` and `MeetAccountGame`, while frontend flows and the product backlog describe scheduling, attendance, planned games, actual plays, and history inconsistently. The backlog explicitly identifies the need to distinguish planned games from games actually played and to make session creation/completion transactional.

## Decision

The product uses **session** as the stable domain concept covering scheduled,
active, completed, and cancelled game events. `Meet` remains the physical
compatibility name for the current session record until a separately reviewed
rename is justified.

The v1 persistence model separates the concerns that were previously mixed:

- `MeetAttendee` stores one row per selected participant, with RSVP state and
  attendance state.
- `MeetGame` stores one row per session game, with planned/played/skipped state
  and optional play order.
- `MeetAccountGame` remains the account-to-game play relation. Existing rows
  are preserved and are treated as historical played-game participation; new
  play-history writes continue to use this relation until a richer play-event
  model is required.

The initial backfill derives selected attendees and played session games from
distinct `MeetAccountGame` pairs. This is the least-destructive interpretation
of the observed data because current dashboard/play code already uses that
table for historical play lookup. Guest identities, timezone-aware scheduling,
ratings, scores, and richer state-transition rules remain deferred product
decisions.

## Consequences

- Session creation and completion become explicit multi-record use cases with transaction or compensation requirements. Organizer lifecycle transitions use a conditional status update inside the write transaction, so a stale concurrent transition cannot overwrite a newer state or skip planned games incorrectly.
- API, frontend, database, and history work can converge on one vocabulary.
- Existing `Meet` routes remain a compatibility layer over the session concept;
  the new relations are additive and do not delete or rewrite historical play
  links.
- Planned and actual play data can support explainable recommendations and trustworthy history. A session becoming completed or cancelled transactionally converts any remaining planned games to `skipped`; played games are preserved unchanged.
- The v1 relation boundaries are decided, but guest identities, timezones,
  ratings, scores, and optimistic concurrency for non-lifecycle replacement
  writes remain separate follow-up decisions.

## Alternatives considered

- **Keep `Meet` as the permanent concept:** matches current tables but conflates an event with its planning and play lifecycle.
- **Use one flat meet-game table:** simpler short term, but cannot represent attendance, planned versus played state, or future transitions cleanly.
- **Defer a canonical model:** avoids immediate decisions but prolongs schema drift and makes feature work unsafe.
