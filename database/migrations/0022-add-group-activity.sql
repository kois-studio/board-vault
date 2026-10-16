-- Group history (#151, ADR-0020): one row per change that affects other people
-- in a group. Append-only: the triggers refuse any UPDATE, and any DELETE
-- while the group still exists, so only deleting the group removes its
-- history. Entries hold references and fixed values, never names or free text.
-- meetId, groupPersonId, gameId and subjectAccountId have no foreign keys on
-- purpose: an entry outlives what it points at, and SET NULL would be an UPDATE.
-- Rollback: DROP TABLE GroupActivity; (drops its index and triggers; only the
-- group history page and its notifications read it).

CREATE TABLE GroupActivity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId INTEGER NOT NULL REFERENCES UserGroup(id) ON DELETE CASCADE,
    actorAccountId INTEGER NOT NULL REFERENCES Account(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    meetId INTEGER,
    groupPersonId INTEGER,
    gameId INTEGER,
    subjectAccountId INTEGER,
    data TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data)),
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_group_activity_group ON GroupActivity(groupId, id);

CREATE TRIGGER group_activity_no_update
BEFORE UPDATE ON GroupActivity
BEGIN
    SELECT RAISE(ABORT, 'GroupActivity is append-only');
END;

CREATE TRIGGER group_activity_no_delete
BEFORE DELETE ON GroupActivity
WHEN EXISTS (SELECT 1 FROM UserGroup WHERE id = OLD.groupId)
BEGIN
    SELECT RAISE(ABORT, 'GroupActivity is append-only');
END;
