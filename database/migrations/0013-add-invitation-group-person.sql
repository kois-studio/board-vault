-- Allow legacy account invitations to target an existing placeholder.
-- The claim is still completed by the invited account after membership is accepted.

ALTER TABLE Invitation ADD COLUMN groupPersonId INTEGER REFERENCES GroupPerson(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invitation_group_person
    ON Invitation(groupPersonId);
