# ADR: Session as a first-class domain concept

- **Status:** Proposed
- **Date:** 2026-08-11
- **Supersedes:** None
- **Superseded by:** None

## Context

The current implementation uses `Meet` and `MeetAccountGame`, while frontend flows and the product backlog describe scheduling, attendance, planned games, actual plays, and history inconsistently. The backlog explicitly identifies the need to distinguish planned games from games actually played and to make session creation/completion transactional.

## Decision

The product should use **session** as the stable UI/API concept covering scheduled, active, completed, and cancelled game events. The domain model should represent attendance separately from session games and distinguish candidate/planned/selected games from games actually played. A temporary database mapping from `Meet` is acceptable only while compatibility is documented and the session-oriented contract remains stable.

This ADR is proposed, not accepted. The final ownership, guest, privacy, timestamp/timezone, rating, and state-transition rules must be resolved before schema implementation, as listed in [todo/01-product-direction.md](../../todo/01-product-direction.md) and [todo/03-data-model-and-session-domain.md](../../todo/03-data-model-and-session-domain.md).

## Consequences

- Session creation and completion become explicit multi-record use cases with transaction or compensation requirements.
- API, frontend, database, and history work can converge on one vocabulary.
- Existing `Meet` tables and routes may require a compatibility layer or migration.
- Planned and actual play data can support explainable recommendations and trustworthy history.
- More domain decisions are required before implementation; agents must not invent them in feature code.

## Alternatives considered

- **Keep `Meet` as the permanent concept:** matches current tables but conflates an event with its planning and play lifecycle.
- **Use one flat meet-game table:** simpler short term, but cannot represent attendance, planned versus played state, or future transitions cleanly.
- **Defer a canonical model:** avoids immediate decisions but prolongs schema drift and makes feature work unsafe.
