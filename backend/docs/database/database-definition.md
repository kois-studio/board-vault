# Database definition

The main database is a SQLite hosted in turso.tech.

```sql
-- -----------------------------------------------------
-- Table 'Account'
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Account (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    avatar TEXT, -- JSON structure to store avatar configuration
    displayName VARCHAR(255), -- Custom name, can be NULL initially
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- auto set to current time
    isDeleted BOOLEAN DEFAULT FALSE, -- soft delete
    isAdmin BOOLEAN DEFAULT FALSE, -- indicates if the account is an admin
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT,
    password_reset_token TEXT
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
-- Table 'GameTranslation' (Game-Translation 1:n)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS GameTranslation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gameId INTEGER NOT NULL,
    languageCode TEXT NOT NULL, -- e.g., 'en', 'es', 'de'
    title TEXT NOT NULL,
    normalizedTitle TEXT NOT NULL, -- Normalized version of 'title' for searching
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    UNIQUE (gameId, languageCode) -- Ensure only one translation per language per game
)

-- -----------------------------------------------------
-- Table 'OwnedGame' (Account-Game n:m)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS OwnedGame (
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    purchasePrice DECIMAL(10, 2),
    purchaseDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    purchaseNotes TEXT, -- for recording if it was a gift or other details
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (accountId, gameId)
);

-- -----------------------------------------------------
-- Table 'WishlistedGame' (Account-Game n:m)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS WishlistedGame (
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    dateAdded DATETIME DEFAULT CURRENT_TIMESTAMP,
    priority INTEGER DEFAULT 3, -- 1-5 scale for wishlist priority
    notes TEXT, -- any note you want to add to the game
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (accountId, gameId)
);

-- -----------------------------------------------------
-- Table 'Tag'
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Tag (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    categoryId INTEGER NOT NULL,
    FOREIGN KEY (categoryId) REFERENCES TagCategory(id) ON DELETE CASCADE,
    UNIQUE (id, categoryId)
);

-- -----------------------------------------------------
-- Table 'TagCategory'
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS TagCategory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

-- -----------------------------------------------------
-- Table 'GameTag' (Game-Tag n:m)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS GameTag (
    gameId INTEGER NOT NULL,
    tagId INTEGER NOT NULL,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    FOREIGN KEY (tagId) REFERENCES Tag(id) ON DELETE CASCADE,
    PRIMARY KEY (gameId, tagId)
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
    FOREIGN KEY (groupId) REFERENCES UserGroup(id) ON DELETE CASCADE,
    FOREIGN KEY (fromAccountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (toAccountId) REFERENCES Account(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table 'Notification' (Account-Notification 1:n)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Notification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accountId INTEGER NOT NULL,
    type TEXT NOT NULL, -- Example values: 'meeting_scheduled', 'games_added', 'user_joined_group'
    message TEXT NOT NULL, -- Can be a template with placeholders like "{user} added {count} games"
    data TEXT NOT NULL, -- JSON data containing relevant IDs and context
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the notification was created
    isRead BOOLEAN DEFAULT 0, -- 0 = Unread, 1 = Read
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table 'GameReview' (Account-Game n:m)
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

-- -----------------------------------------------------
-- Table 'CollectionActivity' (Account-Game n:m)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS CollectionActivity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    actionType TEXT NOT NULL, -- 'added', 'rated', 'wishlisted', 'removed'
    actionDetails TEXT, -- JSON for additional details like rating value
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table 'Meet'
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Meet (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId INTEGER NOT NULL,
    createdBy INTEGER NOT NULL,
    meetDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    isConfirmed BOOLEAN DEFAULT FALSE, -- If confirmed, cannot be edited
    FOREIGN KEY (groupId) REFERENCES UserGroup(id) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES Account(id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table 'MeetAccountGame' (Who played which games at which meet)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS MeetAccountGame (
    meetId INTEGER NOT NULL,
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    FOREIGN KEY (meetId) REFERENCES Meet(id) ON DELETE CASCADE,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (meetId, accountId, gameId)
);

-- -----------------------------------------------------
-- Table 'FeatureFlags' (Feature flags for the app)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS FeatureFlags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    isEnabled BOOLEAN DEFAULT FALSE,
    description TEXT, -- Optional, for documentation purposes
    lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------
-- Indexes
-- -----------------------------------------------------
-- for faster searching on normalized titles across all languages
CREATE INDEX idx_gametranslation_normalized_title ON GameTranslation(normalizedTitle);
```

