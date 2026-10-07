# ADR: Approximate collection worth from retail prices

- **Status:** Accepted
- **Date:** 2026-10-06
- **Supersedes:** None
- **Superseded by:** None

## Context

People like seeing what a collection is worth: what each person brings to a
group's shelf, and roughly what the whole shelf adds up to. A first version
(Bruno's) summed the purchase prices people record for their own copies, and
let each member opt in to sharing that total with a group.

What someone paid is private (ADR-0006): it can be a gift, a second-hand
bargain, or a sum they would rather keep to themselves. Comparing paid amounts
also turns a group into a ranking of who spent most, which is not what a group
of friends needs. Which games each person owns, on the other hand, is already
visible to the group: it is the shared shelf.

## Decision

- **Worth comes from the catalogue, never from purchases.** Each game has an
  optional recommended retail price (PVP) in euros (`Game.retailPriceCents`),
  set by admins. A person's collection worth is the sum of those prices for
  the games they bring to the group; the group's is the sum over every copy.
  Recorded purchase prices are never read for it.
- **An estimate, and said so.** Worth is rounded to whole euros and shown as
  approximate, with how many games had a known price. Games without one are
  left out rather than guessed.
- **No ranking.** The group page shows the group's total and links to each
  person; a person's worth appears only on their own page in that group.
- **Everyone counts.** Members and the group's people without an account,
  with the games the group records for them, as in the group's counts.
- **Euros only** for now. Another currency would need prices per currency or
  a conversion; nothing in the group needs it yet.
- **Sharing what you paid** is left out. If it comes back, it is an explicit,
  revocable choice per account, off by default.

## Consequences

- No new private data leaves an account: retail prices are public, and
  ownership is already visible to the group.
- The estimate is only as good as the catalogue's prices. The admin
  catalogue lists games without one ("No price"), and admins can set the
  price when they approve a proposal or edit a game.
- Retail prices change and differ by edition; the estimate does not try to
  follow them closely.

## Alternatives considered

- **Sum of recorded purchase prices, opt-in per group** (the first version):
  exact, but private, often incomplete (most people skip the price), and a
  spending leaderboard.
- **Market or second-hand value:** closer to what a shelf is worth today, but
  needs an external price source (ADR-0014).
