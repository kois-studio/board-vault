-- Additive identity bridge for the Clerk migration.
--
-- Applied to the board-vault Turso database on 2026-08-12 after validation
-- against the confirmed schema snapshot and an existing-data restore.

ALTER TABLE Account ADD COLUMN clerkUserId TEXT;

CREATE UNIQUE INDEX idx_account_clerk_user_id
    ON Account(clerkUserId);
