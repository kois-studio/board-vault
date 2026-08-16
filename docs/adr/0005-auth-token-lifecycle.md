# ADR: Verification and password-reset token lifecycle

- **Status:** Accepted; migration 0002 applied to live Turso on 2026-08-16
- **Date:** 2026-08-15
- **Supersedes:** None
- **Superseded by:** None

## Context

The legacy authentication path issues email-verification and password-reset
tokens. Before this decision, the database stored token values without expiry
and the service performed a lookup followed by a separate update, so a token
could remain valid indefinitely and concurrent requests could race.

## Decision

Use short-lived, persisted token lifecycles until the legacy authentication path
is retired:

- Email-verification tokens expire after 24 hours.
- Password-reset tokens expire after 1 hour.
- Expiry values are stored as UTC epoch seconds in
  `Account.verification_token_expires_at` and
  `Account.password_reset_token_expires_at`.
- Verification and password reset use one conditional database update that
  checks the token and expiry, performs the state change, and clears both the
  token and expiry. A second use therefore affects zero rows.
- A token with a NULL expiry is invalid. This intentionally fails closed for
  pre-migration rows; migration 0002 and the updated backend must be deployed
  together in each environment.

## Consequences

- Stolen or leaked legacy tokens have a bounded validity window.
- Expiry and consumption are enforced at the backend/database boundary rather
  than by the browser.
- Existing active legacy tokens without expiry will stop working after the new
  backend is deployed; users must request a fresh verification or reset token.
- The migration is additive, and the live schema snapshot was re-exported after
  application. There is no migration runner yet, so environment parity still
  requires an explicit rollout check.
- Rate limiting, browser cookie/session design, CORS policy, and global DTO
  validation remain separate decisions.

## Rollout and verification

1. Restore the preserved backup into a disposable SQLite/libSQL target.
2. Apply [migration 0002](../../database/migrations/0002-add-auth-token-expiry.sql)
   and verify schema, integrity, and preserved domain row counts. This was
   completed for live `board-vault` on 2026-08-16 after a fresh local dump.
3. Deploy the backend code and issue fresh tokens through registration or
   forgot-password in a non-production test account.
4. Verify successful use, expired-token rejection, and second-use rejection;
   focused service tests cover the latter lifecycle and live Turso contains no
   existing token-bearing rows requiring backfill.
