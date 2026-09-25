-- Preserve participant-scoped session data independently from authenticated accounts.

CREATE TABLE MeetPersonAttendee (
    meetId INTEGER NOT NULL,
    groupPersonId INTEGER NOT NULL,
    rsvpStatus TEXT NOT NULL DEFAULT 'pending'
        CHECK (rsvpStatus IN ('pending', 'accepted', 'declined')),
    attendanceStatus TEXT NOT NULL DEFAULT 'unknown'
        CHECK (attendanceStatus IN ('unknown', 'attended', 'absent')),
    respondedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meetId) REFERENCES Meet(id) ON DELETE CASCADE,
    FOREIGN KEY (groupPersonId) REFERENCES GroupPerson(id) ON DELETE RESTRICT,
    PRIMARY KEY (meetId, groupPersonId)
);

CREATE INDEX idx_meet_person_attendee_person
    ON MeetPersonAttendee(groupPersonId, meetId);

CREATE TABLE MeetPersonGame (
    meetId INTEGER NOT NULL,
    groupPersonId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    FOREIGN KEY (meetId) REFERENCES Meet(id) ON DELETE CASCADE,
    FOREIGN KEY (groupPersonId) REFERENCES GroupPerson(id) ON DELETE RESTRICT,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE,
    PRIMARY KEY (meetId, groupPersonId, gameId)
);

CREATE INDEX idx_meet_person_game_person
    ON MeetPersonGame(groupPersonId, gameId);

CREATE INDEX idx_meet_person_game_meet
    ON MeetPersonGame(meetId, gameId);

INSERT INTO MeetPersonAttendee (meetId, groupPersonId, rsvpStatus, attendanceStatus, respondedAt, createdAt)
SELECT
    ma.meetId,
    gp.id,
    ma.rsvpStatus,
    ma.attendanceStatus,
    ma.respondedAt,
    COALESCE(ma.createdAt, CURRENT_TIMESTAMP)
FROM MeetAttendee ma
INNER JOIN Meet m ON m.id = ma.meetId
INNER JOIN GroupPerson gp ON gp.groupId = m.groupId AND gp.accountId = ma.accountId
WHERE NOT EXISTS (
    SELECT 1
    FROM MeetPersonAttendee existing
    WHERE existing.meetId = ma.meetId AND existing.groupPersonId = gp.id
);

INSERT INTO MeetPersonGame (meetId, groupPersonId, gameId)
SELECT
    mag.meetId,
    gp.id,
    mag.gameId
FROM MeetAccountGame mag
INNER JOIN Meet m ON m.id = mag.meetId
INNER JOIN GroupPerson gp ON gp.groupId = m.groupId AND gp.accountId = mag.accountId
WHERE NOT EXISTS (
    SELECT 1
    FROM MeetPersonGame existing
    WHERE existing.meetId = mag.meetId
      AND existing.groupPersonId = gp.id
      AND existing.gameId = mag.gameId
);

CREATE TABLE RecommendationFeedbackParticipant (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accountId INTEGER NOT NULL,
    groupId INTEGER NOT NULL,
    gameId INTEGER NOT NULL,
    participantIds TEXT NOT NULL,
    feedback TEXT NOT NULL
        CHECK (feedback IN ('interested', 'not_for_us', 'played')),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (accountId) REFERENCES Account(id) ON DELETE CASCADE,
    FOREIGN KEY (groupId) REFERENCES UserGroup(id) ON DELETE CASCADE,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE
);

CREATE INDEX idx_recommendation_feedback_participant_group_time
    ON RecommendationFeedbackParticipant(groupId, createdAt DESC, id DESC);
