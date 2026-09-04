-- Store explicit group-level acquisition interest separately from personal wishlists.
-- One member can express interest in a catalog game once per group.

CREATE TABLE GroupGameInterest (
    groupId INTEGER NOT NULL,
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (groupId) REFERENCES UserGroup(id) ON DELETE CASCADE,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (groupId, accountId, gameId)
);

CREATE INDEX idx_group_game_interest_group_game
    ON GroupGameInterest(groupId, gameId, createdAt);
