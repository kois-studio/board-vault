-- Who brings each shortlisted game to a game night (#115). One person at
-- most: an account that owns the game, or a group person without an account
-- that the organizer names. Both NULL means nobody has said they will bring
-- it. A bringer who declines the night is cleared by the app.
-- Rollback: ALTER TABLE MeetGame DROP COLUMN broughtByPersonId;
--           ALTER TABLE MeetGame DROP COLUMN broughtByAccountId;
-- (only the session page and the Home game-night cards read them).

ALTER TABLE MeetGame ADD COLUMN broughtByAccountId INTEGER REFERENCES Account(id) ON DELETE SET NULL;
ALTER TABLE MeetGame ADD COLUMN broughtByPersonId INTEGER REFERENCES GroupPerson(id) ON DELETE SET NULL;
