-- Store one owner-controlled group decision for each acquisition candidate.
-- Ownership remains the terminal truth and is intentionally not duplicated here.

CREATE TABLE GroupAcquisitionDecision (
    groupId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'planned', 'not_now')),
    decidedBy INTEGER,
    decidedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    FOREIGN KEY (groupId) REFERENCES UserGroup(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    FOREIGN KEY (decidedBy) REFERENCES Account(id) ON DELETE CASCADE,
    PRIMARY KEY (groupId, gameId)
);

CREATE INDEX idx_group_acquisition_decision_status
    ON GroupAcquisitionDecision(groupId, status, decidedAt);
