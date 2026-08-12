# Architecture decision records

This directory contains durable project decisions and explicitly marked proposals. ADRs 0001–0003 remain proposals derived from existing product direction. ADR-0004 is accepted for staged authentication rollout:

- [0001 — Group-first product context](0001-group-first-product-context.md)
- [0002 — Deterministic and explainable first-release recommendations](0002-deterministic-explainable-recommendations.md)
- [0003 — Session as a first-class domain concept](0003-session-as-first-class-domain.md)
- [0004 — Clerk-managed authentication with preserved local accounts](0004-clerk-managed-authentication.md) — Accepted; rollout in progress

The project had no accepted ADRs before ADR-0004 was adopted. Proposals do not authorize implementation and must not be treated as settled decisions until accepted.

Create an ADR when a decision changes architecture, persistence, security policy, API compatibility, deployment responsibility, or another durable project constraint. Do not use ADRs for TODOs, bugs, status updates, or temporary investigations.

When a decision changes, preserve the original record, create a new ADR that references it, and mark the earlier decision superseded. Keep the [documentation index](../README.md) updated.
