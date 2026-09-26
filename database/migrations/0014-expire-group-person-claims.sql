-- Expire targeted placeholder claims with their invitation lifecycle.

ALTER TABLE GroupPerson ADD COLUMN claimExpiresAt DATETIME;

UPDATE GroupPerson
SET claimExpiresAt = datetime('now', '+30 days')
WHERE claimEmail IS NOT NULL AND claimExpiresAt IS NULL;

CREATE INDEX idx_group_person_claim_expiry
    ON GroupPerson(groupId, claimExpiresAt)
    WHERE claimEmail IS NOT NULL;
