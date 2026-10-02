-- Who won each played game of a session, with an optional score (#44).
-- One row per participant with a result. A row names either an account
-- (sessions recorded before group people) or a group person, never both.
-- Rows for someone no longer recorded as playing that game are removed by the
-- backend when played games change.
-- Rollback: DROP TABLE MeetGameResult; (no other table depends on it).

CREATE TABLE MeetGameResult (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meetId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    accountId INTEGER,
    groupPersonId INTEGER,
    isWinner INTEGER NOT NULL DEFAULT 0 CHECK (isWinner IN (0, 1)),
    score INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK ((accountId IS NULL) <> (groupPersonId IS NULL)),
    FOREIGN KEY (meetId) REFERENCES Meet(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (groupPersonId) REFERENCES GroupPerson(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX ux_meet_game_result_account
    ON MeetGameResult(meetId, gameId, accountId) WHERE accountId IS NOT NULL;

CREATE UNIQUE INDEX ux_meet_game_result_person
    ON MeetGameResult(meetId, gameId, groupPersonId) WHERE groupPersonId IS NOT NULL;

CREATE INDEX idx_meet_game_result_person
    ON MeetGameResult(groupPersonId, meetId);
