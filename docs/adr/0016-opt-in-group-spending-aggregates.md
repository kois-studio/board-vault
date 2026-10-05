# ADR: Opt-in group spending aggregates

- **Status:** Accepted
- **Date:** 2026-10-04
- **Supersedes:** The group-projection boundary in ADR-0006, only for the aggregate defined here
- **Superseded by:** None

## Context

Members can record purchase prices in their private game collections. A group
history ranking of spending would otherwise disclose private collection data
to other group members.

## Decision

- Sharing is an explicit, revocable choice stored per account and group.
- Only current group members can change their own sharing choice.
- The group insights response includes totals only for members who opted in.
- A total is the sum of that member's recorded game purchase prices. It does
  not expose individual games, purchase dates, or notes.
- Members who have not opted in are absent from the ranking; their private
  prices are not used in group responses.
- Currency is not stored with purchase prices, so the aggregate is displayed
  without a currency label.

## Consequences

- The sharing choice is removed automatically when the account or group is
  membership is deleted, and can be withdrawn at any time.
- New group responses must keep the shared total aggregate-only and must not
  turn sharing into access to a member's private collection.
- The spending ranking is a group-insights view, protected by group membership
  authorization.
