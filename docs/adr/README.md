# Architecture decision records

This directory contains durable project decisions. It intentionally omits
deployment-specific evidence, live data, credentials, and personal details.

- [0001 — Group-first product context](0001-group-first-product-context.md)
- [0002 — Deterministic and explainable recommendations](0002-deterministic-explainable-recommendations.md)
- [0003 — Session as a first-class domain concept](0003-session-as-first-class-domain.md)
- [0004 — Provider-managed authentication with preserved local accounts](0004-clerk-managed-authentication.md)
- [0005 — Verification and password-reset token lifecycle](0005-auth-token-lifecycle.md)
- [0006 — Public nested-user response boundary](0006-user-response-privacy.md)
- [0007 — Invite-only group membership](0007-group-membership-policy.md)
- [0008 — Private-beta registration](0008-private-beta-registration.md)
- [0009 — Group acquisition decisions](0009-group-acquisition-decisions.md)
- [0010 — Group-scoped placeholder identities](0010-group-person-identities.md)
- [0011 — Isolated local development and shared integration](0011-isolated-local-development.md)

Accepted ADRs are durable constraints unless a later ADR explicitly supersedes
them. Create an ADR when a decision changes architecture, persistence,
security policy, API compatibility, or another durable project constraint.
