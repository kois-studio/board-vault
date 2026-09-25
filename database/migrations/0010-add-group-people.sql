-- Group-scoped participant identities.
--
-- A GroupPerson is not an authentication account. It represents somebody who
-- participates in one group and may later be linked to a real Account.

CREATE TABLE GroupPerson (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    groupId INTEGER NOT NULL,
    accountId INTEGER,
    kind TEXT NOT NULL DEFAULT 'placeholder'
        CHECK (kind IN ('placeholder', 'linked')),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived')),
    displayName TEXT NOT NULL,
    avatar TEXT,
    createdByAccountId INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    claimedAt DATETIME,
    FOREIGN KEY (groupId) REFERENCES UserGroup(id) ON DELETE CASCADE,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE SET NULL,
    FOREIGN KEY (createdByAccountId) REFERENCES Account(id) ON DELETE CASCADE,
    CHECK ((kind = 'placeholder' AND accountId IS NULL) OR (kind = 'linked' AND accountId IS NOT NULL))
);

CREATE UNIQUE INDEX idx_group_person_linked_account
    ON GroupPerson(groupId, accountId)
    WHERE accountId IS NOT NULL;

CREATE INDEX idx_group_person_group_status
    ON GroupPerson(groupId, status, displayName);

CREATE TABLE GroupPersonGameOwnership (
    groupPersonId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'asserted'
        CHECK (status IN ('asserted', 'rejected', 'disputed')),
    source TEXT NOT NULL DEFAULT 'placeholder_setup'
        CHECK (source IN ('placeholder_setup', 'account_collection', 'claimed_import')),
    enteredByAccountId INTEGER NOT NULL,
    confirmedByAccountId INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (groupPersonId) REFERENCES GroupPerson(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    FOREIGN KEY (enteredByAccountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (confirmedByAccountId) REFERENCES Account(id) ON DELETE SET NULL,
    PRIMARY KEY (groupPersonId, gameId)
);

CREATE INDEX idx_group_person_ownership_game
    ON GroupPersonGameOwnership(gameId, status);

CREATE TABLE GroupPersonGamePreference (
    groupPersonId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    preference TEXT NOT NULL
        CHECK (preference IN ('favorite', 'like', 'neutral', 'avoid')),
    source TEXT NOT NULL DEFAULT 'placeholder_setup'
        CHECK (source IN ('placeholder_setup', 'claimed_import', 'account_profile')),
    enteredByAccountId INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (groupPersonId) REFERENCES GroupPerson(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    FOREIGN KEY (enteredByAccountId) REFERENCES Account(id) ON DELETE CASCADE,
    PRIMARY KEY (groupPersonId, gameId)
);

CREATE INDEX idx_group_person_preference_game
    ON GroupPersonGamePreference(gameId, preference);

INSERT INTO GroupPerson (
    groupId,
    accountId,
    kind,
    status,
    displayName,
    avatar,
    createdByAccountId,
    createdAt,
    updatedAt
)
SELECT
    gm.groupId,
    gm.accountId,
    'linked',
    'active',
    COALESCE(NULLIF(a.displayName, ''), a.username),
    a.avatar,
    ug.createdBy,
    COALESCE(gm.joinedAt, CURRENT_TIMESTAMP),
    CURRENT_TIMESTAMP
FROM GroupMembership gm
INNER JOIN UserGroup ug ON ug.id = gm.groupId
INNER JOIN Account a ON a.id = gm.accountId
WHERE NOT EXISTS (
    SELECT 1
    FROM GroupPerson existing
    WHERE existing.groupId = gm.groupId
      AND existing.accountId = gm.accountId
);
