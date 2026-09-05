# ADR: Group acquisition decisions are lightweight and group-owned

- **Status:** Accepted
- **Date:** 2026-09-05
- **Supersedes:** None
- **Superseded by:** None

## Context

Board Vault records individual member interest in games the group does not own,
but an interest list alone does not help a group close a purchase conversation.
Without a group-level outcome, the board becomes an accumulating wishlist and
cannot distinguish a live option from something the group has already decided
to postpone. A purchase marketplace, payment workflow, or affiliate catalog is
outside the product direction.

## Decision

Keep `GroupGameInterest` as the individual social signal and add one
group-level acquisition decision per group/game. The decision status is one of:

- `open`: the group is still considering the game;
- `planned`: the group has decided to pursue acquiring it, without implying a
  purchase, price, vendor, or payment;
- `not_now`: the group has decided not to pursue it for now.

Only the group owner can change the group-level decision. Every group member
can see the status and the members who expressed interest. If any current group
member owns the game, the acquisition board hides it because the group can
already play it; ownership is the terminal truth and is not duplicated as a
manual `acquired` status. A new member-interest signal reopens a `not_now`
decision to `open`, making renewed interest visible without creating a shopping
workflow.

The decision stores the owner, timestamp, and optional short note for context.
It remains group-scoped and separate from personal wishlists, recommendations,
and game-detail metadata.

## Consequences

- Groups can close or revisit an acquisition conversation without losing the
  individual interest context.
- Owner authority is explicit and follows the existing v1 group role policy.
- The board remains a social decision surface rather than a catalog or purchase
  system.
- A future purchase or inventory integration can be added without changing the
  meaning of personal wishlist or group interest rows.
- The first release still does not claim that a `planned` decision means a
  purchase occurred; adding the game to a member collection is the current
  ownership signal.

## Alternatives considered

- **Keep only individual interest:** minimal schema, but leaves the group with
  no way to resolve stale or completed conversations.
- **Add purchase/vendor/payment state:** creates a shopping product and scope
  that is not part of Board Vault’s social core.
- **Let every member resolve decisions:** weaker ownership semantics and more
  opportunity for accidental group-state changes; the owner role already
  represents the v1 organizer authority.
