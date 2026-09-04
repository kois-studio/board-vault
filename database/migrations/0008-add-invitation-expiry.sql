-- Legacy username invitations remain actionable for a bounded period.
-- Existing rows receive a deterministic expiry based on their original sentAt.
ALTER TABLE Invitation ADD COLUMN expiresAt DATETIME;

UPDATE Invitation
SET expiresAt = datetime(sentAt, '+30 days')
WHERE expiresAt IS NULL;
