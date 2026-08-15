-- Persisted expiry for legacy email-verification and password-reset tokens.
-- Values are UTC epoch seconds; NULL means that the token cannot be used.

ALTER TABLE Account ADD COLUMN verification_token_expires_at INTEGER;
ALTER TABLE Account ADD COLUMN password_reset_token_expires_at INTEGER;
