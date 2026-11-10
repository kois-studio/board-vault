-- People are invited by username only (#277). A placeholder is claimed by the
-- account an invitation suggested it to (Invitation.groupPersonId +
-- toAccountId), never by an email address, so GroupPerson.claimEmail and
-- claimExpiresAt are no longer written or read. The columns stay (migrations are
-- additive); this clears them so no one's email address stays stored there.
--
-- A claim already in progress keeps working: when the email still belongs to an
-- account that is in the group, it becomes an invitation row with the same
-- expiry, which is the claim ticket the code now reads. A claim for an email
-- with no account (an email invitation nobody used) is dropped.
--
-- Rollback: the cleared emails cannot be restored from this file; restore the
-- pre-migration backup if needed. The added rows can be told apart by
-- sentAt = the migration time and removed with
--   DELETE FROM Invitation WHERE groupPersonId IS NOT NULL AND sentAt >= '<migration time>';

INSERT INTO Invitation (groupId, fromAccountId, toAccountId, expiresAt, groupPersonId)
SELECT gp.groupId, ug.createdBy, a.id, gp.claimExpiresAt, gp.id
FROM GroupPerson gp
INNER JOIN UserGroup ug ON ug.id = gp.groupId
INNER JOIN Account a ON lower(a.email) = lower(gp.claimEmail) AND a.isDeleted = 0
WHERE gp.claimEmail IS NOT NULL
  AND gp.claimExpiresAt > CURRENT_TIMESTAMP
  AND gp.kind = 'placeholder' AND gp.status = 'active' AND gp.accountId IS NULL
  AND a.id <> ug.createdBy
  AND EXISTS (SELECT 1 FROM GroupMembership gm WHERE gm.groupId = gp.groupId AND gm.accountId = a.id)
  AND NOT EXISTS (
      SELECT 1 FROM Invitation i
      WHERE i.groupId = gp.groupId AND i.toAccountId = a.id AND i.groupPersonId = gp.id
  );

UPDATE GroupPerson
SET claimEmail = NULL, claimExpiresAt = NULL
WHERE claimEmail IS NOT NULL OR claimExpiresAt IS NOT NULL;
