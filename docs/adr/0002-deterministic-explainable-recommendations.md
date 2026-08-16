# ADR: Deterministic and explainable first-release recommendations

- **Status:** Accepted
- **Date:** 2026-08-11
- **Supersedes:** None
- **Superseded by:** None

## Context

The first-release product direction calls for useful recommendations based on attendees, time, availability, ownership, preferences, and history. The repository does not yet contain a recommendation engine or a stable session model. A machine-learning system would add data, evaluation, observability, and explanation requirements before the core product loop is proven.

## Decision

For the first flagship release, recommendations use hard eligibility filters followed by a deterministic, transparent score. Each result includes explanation fields that identify the relevant constraints or scoring factors. Machine learning is out of scope for this first release.

The ownership policy is collective attendee ownership: a game is eligible when at least one selected attendee owns it. The request must identify the selected attendees, and every attendee must be a member of the selected group. A game owned only by an absent group member is not eligible for that recommendation request. An empty attendee list is invalid.

The first score uses only data that is currently persisted and reliable: player-count eligibility, selected-attendee ownership coverage, selected-attendee ratings, and optional duration fit. Last-play information may be shown as explanation context but is not yet a score factor. Recommendation feedback, richer preferences, complexity, and history-weighted scoring remain deferred until the product has a stable feedback model.

## Consequences

- Results can be unit-tested and reproduced for the same inputs.
- The API needs explicit input constraints and explanation fields.
- Product owners can inspect why a game was included or excluded.
- Initial recommendations may be less personalized than a trained model.
- Recommendations are group-useful without making the organizer the only source of playable games.
- The initial score can be revised without changing eligibility semantics.
- Future ML work, if justified, must preserve a measurable fallback and safe explanation behavior.

## Alternatives considered

- **Machine-learning recommendations first:** potentially more personalized, but requires data and evaluation that do not exist yet.
- **Random or popularity-based suggestions:** faster to implement, but not aligned with group constraints or explainability.
- **Manual recommendations:** useful for discovery, but not a repeatable product capability.
