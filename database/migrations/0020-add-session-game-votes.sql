-- Per-night votes on a game night's shortlist (#114): anyone coming can say
-- "I'd play this" for a shortlisted game, and the shortlist orders by votes.
-- A vote belongs to one session, one game and one account; group people
-- without an account do not vote. Votes go with their session.
-- Rollback: DROP TABLE MeetGameVote; (only the session page reads it).

CREATE TABLE MeetGameVote (
    meetId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    accountId INTEGER NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (meetId, gameId, accountId),
    FOREIGN KEY (meetId) REFERENCES Meet(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE
);
