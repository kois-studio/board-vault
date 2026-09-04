# Effective local engineering rules

This page is the project-local summary of the selected Engineering Standards `0.2.0` rules. The auditable rule IDs, evidence, status, priority, and next actions live in [project-standards.yml](project-standards.yml). The project has many recorded gaps; these rules describe the expected behavior for new work and remediation.

## Compliance vocabulary

- **Compliant:** repository evidence shows the rule is satisfied.
- **Partial:** the rule is partly or inconsistently satisfied.
- **Gap:** the rule applies and is currently unsatisfied.
- **Deferred:** the gap is known and intentionally scheduled, with a reason.
- **Exception:** an accepted alternative with rationale, owner/scope, and compensating control.
- **Not applicable:** the rule does not apply, with a reason.
- **Unknown:** evidence is insufficient; never treat it as compliant.

## Rules that apply to every change

- Documentation MUST have one clear source of truth, valid maintained links, and current-state accuracy. Update [docs/README.md](README.md) when maintained documents move or are added.
- Agents MUST preserve the distinction between implemented facts, product intent, recommendations, assumptions, unknowns, and deferred work.
- New TypeScript MUST use strict, meaningful types and MUST NOT add undocumented unsafe `any` usage.
- External input MUST be validated before application/domain logic. Outputs and errors MUST be safe and contract-aligned.
- Secrets MUST NOT be committed, bundled into the client, written to logs, or placed in fixtures/docs.
- A completed feature MUST have risk-appropriate tests, including rejection/isolation tests for security-sensitive behavior.
- Dependencies and toolchains MUST be reproducible through a declared package manager, committed lockfiles, and pinned/documented runtimes once the readiness work is complete.

## Backend rules

- Nest modules SHOULD align with capabilities, expose intentional interfaces, and keep controllers thin.
- Authorization and domain invariants MUST hold beyond controllers and MUST be enforced for every alternate entry point.
- DTO/schema validation MUST protect HTTP, configuration, persistence, and provider boundaries.
- Persistence and cache integrations MUST be isolated behind intentional module/adapter boundaries.
- Multi-record use cases MUST define transaction, ordering, duplicate, partial-failure, and recovery behavior.
- Deployed services MUST validate startup configuration, provide appropriate health/readiness signaling, log safely, and shut down predictably.
- HTTP routes MUST align with a versioned machine-readable contract, stable safe errors, bounded collections, compatibility/deprecation rules, and explicit retry/idempotency behavior.

## Frontend rules

- Angular features SHOULD remain understandable by business capability; components SHOULD focus on presentation/orchestration and keep complex rules independently testable.
- Strict Angular compiler checks MUST remain enabled.
- API responses and user input MUST be validated at application boundaries.
- UI guards, hidden controls, and client state MUST NOT be the sole authorization enforcement point.
- Asynchronous interactions MUST model applicable loading, empty, success, failure, cancellation, and retry states.
- Shared state MUST have an explicit owner, scope, lifetime, reset policy, persistence policy, and synchronization strategy.
- Critical authenticated journeys SHOULD have browser coverage, and representative routes MUST be audited for accessibility, responsive behavior, and unsupported claims.

## Styling rules

- Tailwind is the selected primary styling system. Custom SCSS MAY remain where it has a documented responsibility, but competing styling systems and deprecation/error warnings must be reduced through tracked work.
- New UI work MUST preserve keyboard access, visible focus, meaningful labels, responsive behavior, and explicit empty/error/loading states.

## Current project deviations

The contract records the current deviations rather than hiding them: incomplete integration/authenticated-browser coverage, incomplete authorization and validation, no stable API contract, incomplete operations/recovery evidence, and frontend quality/a11y work still pending. Root/package lockfiles, npm policy, CI quality gates, and a dependency-free root command layer are now established; these are still not substitutes for the remaining delivery gates. These are remediation work, not exceptions.
