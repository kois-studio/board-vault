-- "This is me" (#278, ADR-0027). Someone who joins a group can take over one of
-- its people without an account. A wrong pick has to be undoable, so the
-- takeover keeps a snapshot of the person as it was: name, picture, status,
-- games and preferences (JSON), and the game nights the person was on (meet
-- ids). Undo puts the person back from it and deletes the row.
--
-- One row per person (the latest takeover). Rows are kept for 30 days: the
-- daily job deletes older ones, and the undo refuses them. Deleting the
-- account that took the person over deletes its rows; deleting the group
-- deletes them through the cascade (and explicitly, for databases without
-- foreign keys).
--
-- Rollback: DROP INDEX GroupPersonTakeover_createdAt;
--           DROP INDEX GroupPersonTakeover_accountId;
--           DROP TABLE GroupPersonTakeover;

CREATE TABLE GroupPersonTakeover (
    groupPersonId INTEGER PRIMARY KEY REFERENCES GroupPerson(id) ON DELETE CASCADE,
    groupId INTEGER NOT NULL REFERENCES UserGroup(id) ON DELETE CASCADE,
    accountId INTEGER NOT NULL REFERENCES Account(id) ON DELETE CASCADE,
    snapshot TEXT NOT NULL CHECK (json_valid(snapshot)),
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX GroupPersonTakeover_accountId ON GroupPersonTakeover (accountId);
CREATE INDEX GroupPersonTakeover_createdAt ON GroupPersonTakeover (createdAt);
