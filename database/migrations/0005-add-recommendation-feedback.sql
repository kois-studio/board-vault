-- Store lightweight recommendation feedback for later scoring improvements.
-- The attendee list is JSON text so each response keeps the recommendation context.

CREATE TABLE RecommendationFeedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accountId INTEGER NOT NULL,
    groupId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    attendeeIds TEXT NOT NULL,
    feedback TEXT NOT NULL CHECK (feedback IN ('interested', 'not_for_us', 'played')),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (groupId) REFERENCES UserGroup(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE
);

CREATE INDEX idx_recommendation_feedback_group_date
    ON RecommendationFeedback(groupId, createdAt);
