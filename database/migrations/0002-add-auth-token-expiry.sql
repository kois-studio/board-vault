-- Persisted expiry for legacy email-verification and password-reset tokens.
-- Values are UTC epoch seconds; NULL means that the token cannot be used.
-- Applied to live board-vault on 2026-08-16 after a fresh local backup and
-- integrity/foreign-key verification.

ALTER TABLE Account ADD COLUMN verification_token_expires_at INTEGER;
ALTER TABLE Account ADD COLUMN password_reset_token_expires_at INTEGER;
