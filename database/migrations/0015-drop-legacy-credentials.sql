-- Sign-in is Clerk-only (ADR-0012) and every Account row is linked by
-- clerkUserId. Drop the legacy credential columns.
--
-- ALTER TABLE ... DROP COLUMN rewrites the table in place. It never drops the
-- Account table, so no ON DELETE CASCADE fires and no dependent row changes.
-- Rollback: re-add the columns with ALTER TABLE ... ADD COLUMN.

ALTER TABLE Account DROP COLUMN password;
ALTER TABLE Account DROP COLUMN email_verified;
ALTER TABLE Account DROP COLUMN verification_token;
ALTER TABLE Account DROP COLUMN verification_token_expires_at;
ALTER TABLE Account DROP COLUMN password_reset_token;
ALTER TABLE Account DROP COLUMN password_reset_token_expires_at;
