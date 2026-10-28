-- People can say which edition of a game they own (ADR-0025, #188), so their
-- shelf shows the title on their own box. editionId is NULL when they have not
-- said (every row before this migration, and games with one edition): the
-- copy then shows the title the reader's language resolves to. The edition
-- going away (an admin removes it) sets it back to NULL.
-- Rollback: DROP INDEX OwnedGame_edition;
--           ALTER TABLE OwnedGame DROP COLUMN editionId;

ALTER TABLE OwnedGame ADD COLUMN editionId INTEGER REFERENCES GameEdition(id) ON DELETE SET NULL;

CREATE INDEX OwnedGame_edition ON OwnedGame (editionId);
