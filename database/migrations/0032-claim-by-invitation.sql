-- People are invited by username only (#277). A placeholder is claimed by the
-- account an invitation suggested it to (Invitation.groupPersonId +
-- toAccountId), never by an email address, so GroupPerson.claimEmail and
-- claimExpiresAt are no longer written or read. The columns stay (migrations are
-- additive); this clears them so no one's email address stays stored there.
--
-- A claim still waiting on an email is dropped: production had none on
-- 2026-11-10, and the group can invite that person again by username.
--
-- Rollback: the cleared emails cannot be restored from this file; restore the
-- pre-migration backup if needed.

UPDATE GroupPerson
SET claimEmail = NULL, claimExpiresAt = NULL
WHERE claimEmail IS NOT NULL OR claimExpiresAt IS NOT NULL;
