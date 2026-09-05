# Architecture decision records

This directory contains durable project decisions and explicitly marked proposals. ADR-0001 is accepted as the group-first product context. ADR-0002 is accepted for the first-release recommendation eligibility and scoring policy. ADR-0003 is accepted for the session domain and ADR-0004 is accepted for staged authentication rollout:

- [0001 — Group-first product context](0001-group-first-product-context.md)
- [0002 — Deterministic and explainable first-release recommendations](0002-deterministic-explainable-recommendations.md) — Accepted; collective selected-attendee ownership is the v1 eligibility rule
- [0003 — Session as a first-class domain concept](0003-session-as-first-class-domain.md) — Accepted; lifecycle work is in progress
- [0004 — Clerk-managed authentication with preserved local accounts](0004-clerk-managed-authentication.md) — Accepted; rollout in progress
- [0005 — Verification and password-reset token lifecycle](0005-auth-token-lifecycle.md) — Accepted; migration 0002 applied to live Turso on 2026-08-16
- [0006 — Public nested-user response boundary](0006-user-response-privacy.md) — Accepted; self/admin DTO audit remains open
- [0007 — Invite-only group membership with owner/member roles](0007-group-membership-policy.md) — Accepted; public groups and richer roles are deferred
- [0008 — Private-beta registration with preserved account access](0008-private-beta-registration.md) — Accepted; production sign-up is restricted until first-release completion criteria are met
- [0009 — Group acquisition decisions are lightweight and group-owned](0009-group-acquisition-decisions.md) — Accepted; owner-controlled open/planned/not-now state remains separate from personal interest and ownership

Accepted ADRs are durable constraints unless a later ADR explicitly supersedes them.

Create an ADR when a decision changes architecture, persistence, security policy, API compatibility, deployment responsibility, or another durable project constraint. Do not use ADRs for TODOs, bugs, status updates, or temporary investigations.

When a decision changes, preserve the original record, create a new ADR that references it, and mark the earlier decision superseded. Keep the [documentation index](../README.md) updated.
