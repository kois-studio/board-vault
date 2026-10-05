-- Store each member's explicit, group-specific consent to share a spending aggregate.
-- Rollback: DROP TABLE GroupSpendingShare;

CREATE TABLE GroupSpendingShare (
    groupId INTEGER NOT NULL,
    accountId INTEGER NOT NULL,
    sharedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accountId, groupId) REFERENCES GroupMembership(accountId, groupId) ON DELETE CASCADE,
    PRIMARY KEY (groupId, accountId)
);

CREATE INDEX idx_group_spending_share_membership
    ON GroupSpendingShare(accountId, groupId);
