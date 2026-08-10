# ADR: Deterministic and explainable first-release recommendations

- **Status:** Proposed
- **Date:** 2026-08-11
- **Supersedes:** None
- **Superseded by:** None

## Context

The first-release product direction calls for useful recommendations based on attendees, time, availability, ownership, preferences, and history. The repository does not yet contain a recommendation engine or a stable session model. A machine-learning system would add data, evaluation, observability, and explanation requirements before the core product loop is proven.

## Decision

For the first flagship release, recommendations should use hard eligibility filters followed by a deterministic, transparent score. Each result should include explanation fields that identify the relevant constraints or scoring factors. Machine learning is out of scope for this first release. Recommendation feedback can be persisted and used for later scoring revisions.

This ADR is proposed, not accepted. The precise ownership policy, minimum recommendation data, and scoring weights remain open in [todo/01-product-direction.md](../../todo/01-product-direction.md) and [todo/04-core-product-loop.md](../../todo/04-core-product-loop.md).

## Consequences

- Results can be unit-tested and reproduced for the same inputs.
- The API needs explicit input constraints and explanation fields.
- Product owners can inspect why a game was included or excluded.
- Initial recommendations may be less personalized than a trained model.
- Future ML work, if justified, must preserve a measurable fallback and safe explanation behavior.

## Alternatives considered

- **Machine-learning recommendations first:** potentially more personalized, but requires data and evaluation that do not exist yet.
- **Random or popularity-based suggestions:** faster to implement, but not aligned with group constraints or explainability.
- **Manual recommendations:** useful for discovery, but not a repeatable product capability.
