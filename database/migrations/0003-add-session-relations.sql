-- Canonical v1 session relations.
--
-- `Meet` remains the compatibility/session record. `MeetAttendee` stores
-- selected participants and `MeetGame` stores the session game state.
-- `MeetAccountGame` is intentionally preserved as the account-to-play
-- relation used by historical play lookup.
--
-- Applied to live board-vault on 2026-08-16 after backup and representative
-- data verification.

CREATE TABLE MeetAttendee (
    meetId INTEGER NOT NULL,
    accountId INTEGER NOT NULL,
    rsvpStatus TEXT NOT NULL DEFAULT 'accepted'
        CHECK (rsvpStatus IN ('pending', 'accepted', 'declined')),
    attendanceStatus TEXT NOT NULL DEFAULT 'unknown'
        CHECK (attendanceStatus IN ('unknown', 'attended', 'absent')),
    respondedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meetId) REFERENCES Meet(id) ON DELETE CASCADE,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    PRIMARY KEY (meetId, accountId)
);

CREATE INDEX idx_meetattendee_accountId
    ON MeetAttendee(accountId);

CREATE TABLE MeetGame (
    meetId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    gameStatus TEXT NOT NULL DEFAULT 'planned'
        CHECK (gameStatus IN ('planned', 'played', 'skipped')),
    playOrder INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meetId) REFERENCES Meet(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (meetId, gameId)
);

CREATE INDEX idx_meetgame_gameId
    ON MeetGame(gameId);

-- Historical MeetAccountGame rows represent the only observed participant
-- and played-game evidence. Preserve their meaning while making both domains
-- queryable independently.
INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus)
SELECT DISTINCT meetId, accountId, 'accepted', 'attended'
FROM MeetAccountGame;

INSERT INTO MeetGame (meetId, gameId, gameStatus)
SELECT DISTINCT meetId, gameId, 'played'
FROM MeetAccountGame;
