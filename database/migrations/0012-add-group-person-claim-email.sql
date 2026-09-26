-- Bind targeted placeholder invitations to the verified invitee email.

ALTER TABLE GroupPerson ADD COLUMN claimEmail TEXT;

CREATE INDEX idx_group_person_claim_email
    ON GroupPerson(groupId, claimEmail)
    WHERE claimEmail IS NOT NULL;
