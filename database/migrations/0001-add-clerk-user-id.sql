-- Additive identity bridge for the Clerk migration.
--
-- This migration is prepared but has not been applied to the live Turso
-- database. Apply it only after validating it against the confirmed schema
-- snapshot and an existing-data restore.

ALTER TABLE Account ADD COLUMN clerkUserId TEXT;

CREATE UNIQUE INDEX idx_account_clerk_user_id
    ON Account(clerkUserId);
