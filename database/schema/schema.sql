-- Board Vault current deployed schema export.
--
-- Source: Turso schema inspection, supplied by the project owner and verified
-- against the live database on 2026-08-12.
-- This is an observed schema snapshot, not a migration. Do not apply it
-- directly to another environment without creating and reviewing migrations.

CREATE TABLE Account (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    avatar TEXT,
    displayName VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    isDeleted BOOLEAN DEFAULT FALSE,
    isAdmin BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT,
    password_reset_token TEXT,
    clerkUserId TEXT
);

CREATE TABLE CollectionActivity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    actionType TEXT NOT NULL,
    actionDetails TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE
);

CREATE TABLE FeatureFlags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    isEnabled BOOLEAN DEFAULT FALSE,
    description TEXT,
    lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Game (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    imageUrl TEXT NOT NULL,
    gameAvgDuration INTEGER,
    minPlayers INTEGER,
    maxPlayers INTEGER
);

CREATE TABLE GameProposal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submittedBy INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')) DEFAULT 'pending',
    title TEXT NOT NULL,
    imageUrl TEXT,
    gameAvgDuration INTEGER,
    minPlayers INTEGER,
    maxPlayers INTEGER,
    proposedTags TEXT,
    notes TEXT,
    reviewedBy INTEGER,
    reviewedAt DATETIME,
    reviewNotes TEXT,
    createdGameId INTEGER,
    submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submittedBy) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewedBy) REFERENCES Account(id) ON DELETE SET NULL,
    FOREIGN KEY (createdGameId) REFERENCES Game(id) ON DELETE SET NULL
);

CREATE TABLE GameReview (
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    review INTEGER NOT NULL CHECK (review >= 0 AND review <= 10),
    reviewDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (accountId, gameId)
);

CREATE TABLE GameTag (
    gameId INTEGER NOT NULL,
    tagId INTEGER NOT NULL,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    FOREIGN KEY (tagId) REFERENCES Tag(id) ON DELETE CASCADE,
    PRIMARY KEY (gameId, tagId)
);

CREATE TABLE GameTranslation (
    gameId INTEGER NOT NULL,
    languageCode TEXT NOT NULL,
    title TEXT NOT NULL,
    normalizedTitle TEXT NOT NULL,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (gameId, languageCode)
);

CREATE TABLE GroupMembership (
    accountId INTEGER NOT NULL,
    groupId INTEGER NOT NULL,
    joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (groupId) REFERENCES UserGroup(id) ON DELETE CASCADE,
    PRIMARY KEY (accountId, groupId)
);

CREATE TABLE Invitation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId INTEGER NOT NULL,
    fromAccountId INTEGER NOT NULL,
    toAccountId INTEGER NOT NULL,
    sentAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (groupId) REFERENCES UserGroup(id) ON DELETE CASCADE,
    FOREIGN KEY (fromAccountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (toAccountId) REFERENCES Account(id) ON DELETE CASCADE
);

CREATE TABLE Meet (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId INTEGER NOT NULL,
    createdBy INTEGER NOT NULL,
    meetDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    isConfirmed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (groupId) REFERENCES UserGroup(id) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES Account(id) ON DELETE CASCADE
);

CREATE TABLE MeetAccountGame (
    meetId INTEGER NOT NULL,
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    FOREIGN KEY (meetId) REFERENCES Meet(id) ON DELETE CASCADE,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (meetId, accountId, gameId)
);

CREATE TABLE Notification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accountId INTEGER NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    isRead BOOLEAN DEFAULT 0,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE
);

CREATE TABLE OwnedGame (
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    purchasePrice DECIMAL(10,2),
    purchaseDate DATE,
    purchaseNotes TEXT,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (accountId, gameId)
);

CREATE TABLE Tag (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    categoryId INTEGER NOT NULL,
    FOREIGN KEY (categoryId) REFERENCES TagCategory(id) ON DELETE CASCADE,
    UNIQUE (id, categoryId)
);

CREATE TABLE TagCategory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE UserGroup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    createdBy INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES Account(id) ON DELETE CASCADE
);

CREATE TABLE WishlistedGame (
    accountId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    dateAdded DATETIME DEFAULT CURRENT_TIMESTAMP,
    priority INTEGER DEFAULT 3,
    notes TEXT,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (accountId, gameId)
);

CREATE INDEX idx_gameproposal_status ON GameProposal(status);
CREATE INDEX idx_gameproposal_submitted_by ON GameProposal(submittedBy);
CREATE INDEX idx_groupmembership_accountId ON GroupMembership(accountId);
CREATE INDEX idx_ownedgame_gameId ON OwnedGame(gameId);
CREATE UNIQUE INDEX idx_account_clerk_user_id ON Account(clerkUserId);
