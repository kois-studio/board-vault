# Database definition

The main database is a SQLite hosted in turso.tech.

I will describe you the DB structure, so then you confirm me with a "OK" if everything is clear.

```sql
-- -----------------------------------------------------
-- Table 'Account'
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Account (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    imageUrl TEXT, -- Profile picture, can be NULL initially
    display_name VARCHAR(255), -- Custom name, can be NULL initially
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- auto set to current time
    is_deleted BOOLEAN DEFAULT FALSE -- soft delete
);

-- -----------------------------------------------------
-- Table 'Game'
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Game (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT UNIQUE NOT NULL,
    imageUrl TEXT NOT NULL,
    gameAvgDuration INTEGER,
    minPlayers INTEGER,
    maxPlayers INTEGER
);

-- -----------------------------------------------------
-- Table 'OwnedGame' (Account-Game n:m)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS OwnedGame (
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (accountId, gameId)
);

-- -----------------------------------------------------
-- Table 'UserGroup' (Account-Group 1:n)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS UserGroup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    createdBy INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, -- auto set to current time
    FOREIGN KEY (createdBy) REFERENCES Account(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table 'GroupMembership' (Account-Group n:m)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS GroupMembership (
    accountId INTEGER NOT NULL,
    groupId INTEGER NOT NULL,
    joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (groupId) REFERENCES UserGroup(id) ON DELETE CASCADE,
    PRIMARY KEY (accountId, groupId)
);

-- -----------------------------------------------------
-- Table 'Invitation' (Account-Group n:m)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Invitation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId INTEGER NOT NULL,
    fromAccountId INTEGER NOT NULL,
    toAccountId INTEGER NOT NULL,
    sentAt DATETIME DEFAULT CURRENT_TIMESTAMP, -- auto set to current time
    FOREIGN KEY (groupId) REFERENCES UserGroup(id),
    FOREIGN KEY (fromAccountId) REFERENCES Account(id),
    FOREIGN KEY (toAccountId) REFERENCES Account(id)
);

-- -----------------------------------------------------
-- Table 'Notification' (Account-Notification 1:n)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Notification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accountId INTEGER NOT NULL,
    type TEXT NOT NULL, -- Example values: 'expelled', 'member_left', 'invitation', 'new_game_added'
    message TEXT NOT NULL, -- Description of the notification
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the notification was created
    isRead BOOLEAN DEFAULT 0, -- 0 = Unread, 1 = Read
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
);

-- -----------------------------------------------------
-- Table 'GameReview' (Account-Game n:m with a review value)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS GameReview (
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    review INTEGER NOT NULL CHECK (review >= 0 AND review <= 10), -- Assuming a review scale from 1 to 5
    reviewDate DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the review was made
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (accountId, gameId) -- Ensures one review per account per game
);
```
