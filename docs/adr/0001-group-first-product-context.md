# ADR: Group-first product context

- **Status:** Accepted
- **Date:** 2026-09-05
- **Supersedes:** None
- **Superseded by:** None

## Context

The product backlog identifies the recurring board-game organizer as the initial persona and frames the core job as deciding what a particular group can play. The current code has individual collections, groups, meets, reviews, and play history, but the product surface is broader than the implemented flagship loop. A future agent needs a durable product boundary before adding recommendations, sessions, or marketing claims.

## Decision

For the first flagship release, the group is the primary product context for recommendations and shared history. Individual collections remain inputs, but recommendation and session behavior should be evaluated against the intersection of group members, selected attendees, available games, constraints, and prior group history.

This decision is accepted as the product context for the restart. Board Vault is a social decision-and-memory layer for recurring game groups: the group workspace, shared collection, recommendations, play history, and lightweight statistics are the product center. Game details are supporting context only; catalog breadth, import depth, and public discovery must not displace the group loop.

Ownership policy, invited guests, privacy, rating visibility, and the exact minimum recommendation data remain governed by the product workstreams and later ADRs where needed.

## Consequences

- Product work can prioritize one recurring group and organizer/host persona.
- Recommendation and session APIs will need group context rather than only a user ID.
- Collection-only features remain supporting capabilities, not the flagship promise.
- Public claims should not imply a complete platform until the group loop is implemented and verified.
- The choice may limit early expansion into platform-wide statistics, clubs, billing, or public APIs.

## Alternatives considered

- **Individual-first recommendations:** simpler initial data flow, but does not address the stated group decision problem.
- **Platform-wide social/product scope:** broader surface and higher coordination cost before the core loop is reliable.
- **No product focus:** preserves flexibility but leaves agents without a sequencing boundary.
