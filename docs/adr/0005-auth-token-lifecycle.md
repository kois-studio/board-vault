# ADR: Verification and password-reset token lifecycle

- **Status:** Superseded
- **Date:** 2026-08-15
- **Supersedes:** None
- **Superseded by:** [0012](0012-clerk-only-authentication.md); the tokens and their columns were removed

## Context

The compatibility authentication path issues email-verification and
password-reset tokens. Unbounded tokens and a lookup followed by a separate
update would make replay and concurrent-use behavior unsafe.

## Decision

Use short-lived, persisted token lifecycles until the compatibility path is
retired:

- email-verification tokens expire after 24 hours;
- password-reset tokens expire after 1 hour;
- expiry values are stored as UTC epoch seconds;
- verification and reset consume a token through one conditional database
  update that checks expiry, performs the state change, and clears the token;
- a missing or expired expiry is invalid, so pre-migration tokens fail closed.

## Consequences

Leaked legacy tokens have a bounded validity window, and the backend/database
boundary—not the browser—enforces expiry and single use. The migration and
backend release must be coordinated in each environment using private backup,
rollback, and verification procedures.
