# ADR: Own the game catalogue

- **Status:** Accepted
- **Date:** 2026-10-01
- **Supersedes:** None
- **Superseded by:** None

## Context

Games enter Board Vault through the `Game` table: a user proposes a game and
an admin approves it, which creates the game and its translations. That path
is the slowest part of building a shelf.

The obvious shortcut is an external catalogue, usually the BoardGameGeek XML
API. Since July 2025 it requires a registered application and a bearer token,
approval is manual, and its terms and availability are outside our control.
ADR-0001 already says catalogue breadth and import depth must not displace
the group loop.

## Decision

The `Game` table and its related tables are the only source of truth for
game data. Board Vault does not call an external catalogue at request time
and does not depend on one to add games.

- Games keep arriving through proposals and admin approval. Shelf friction
  is solved inside that flow first (faster review, proposals that land on
  the proposer's shelf).
- An external catalogue stays an idea, not a dependency. If it is ever
  used, it is an admin-side import that copies fields into our own tables;
  nothing at runtime reads from it, and the app keeps working if it
  disappears.

## Consequences

- No third-party API keys, quotas, or terms to manage for game data.
- Game data quality depends on proposals and admin review.
- Revisit when proposal review becomes the bottleneck: proposals waiting
  more than a few days, or groups unable to build a shelf without help.
  A new ADR would then decide the import source and its licensing.

## Alternatives considered

- **BoardGameGeek search at request time:** fastest onboarding, but the app
  would depend on an external service and its access approval.
- **Bulk import from BoardGameGeek into `Game`:** keeps ownership, but needs
  API access and licensing review; deferred, not rejected.
