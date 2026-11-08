-- Creating a game night can time out after Turso has already committed it, and
-- saving again would record the night twice (#246). The app sends an
-- Idempotency-Key with each submission; the key is written in the same
-- transaction as the night, so a repeat with the same key returns the first
-- night instead of creating another. Keys are kept for 24 hours (the daily job
-- deletes older ones). requestHash is a SHA-256 of the request body, so a key
-- reused for a different request is refused; nothing personal is stored.
-- completedAt is set by the first request that gets past the write and goes on
-- to tell people and count the creation. When the write committed but timed
-- out, the retry finds it NULL and does that instead, so nobody is told twice
-- and nobody is left untold.
-- Rollback: DROP INDEX IdempotencyKey_createdAt;
--           DROP TABLE IdempotencyKey;

CREATE TABLE IdempotencyKey (
    accountId INTEGER NOT NULL REFERENCES Account(id) ON DELETE CASCADE,
    idempotencyKey TEXT NOT NULL,
    route TEXT NOT NULL,
    requestHash TEXT NOT NULL,
    resourceId INTEGER NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completedAt DATETIME,
    PRIMARY KEY (accountId, idempotencyKey)
);

CREATE INDEX IdempotencyKey_createdAt ON IdempotencyKey (createdAt);
