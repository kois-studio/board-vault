-- A proposal says which language its title is in and may list other known
-- titles (ADR-0025, #187), so approving it can create the right editions.
-- titleLanguage is NULL on proposals made before this migration: those titles
-- are English. otherTitles is a JSON array of {languageCode, title}, NULL
-- when there are none.
-- Rollback: ALTER TABLE GameProposal DROP COLUMN titleLanguage;
--           ALTER TABLE GameProposal DROP COLUMN otherTitles;

ALTER TABLE GameProposal ADD COLUMN titleLanguage TEXT;
ALTER TABLE GameProposal ADD COLUMN otherTitles TEXT;
