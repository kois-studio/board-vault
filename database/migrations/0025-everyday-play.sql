-- Personal Home preferences and separate plays within a session. Roll back the
-- application first; the new tables and revision column may safely remain.
CREATE TABLE AccountHomePreference (
    accountId INTEGER PRIMARY KEY REFERENCES Account(id) ON DELETE CASCADE,
    preferences TEXT NOT NULL CHECK (json_valid(preferences))
);

ALTER TABLE Meet ADD COLUMN recordingRevision INTEGER NOT NULL DEFAULT 0;

-- No names or other personal fields: participant/result identities are ids,
-- validated against the session and projected into the existing relations.
-- MeetPersonGame keeps the existing RESTRICT protection for group people.
CREATE TABLE MeetPlay (
    meetId INTEGER NOT NULL REFERENCES Meet(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    gameId INTEGER NOT NULL REFERENCES Game(id) ON DELETE CASCADE,
    details TEXT NOT NULL CHECK (json_valid(details)),
    PRIMARY KEY (meetId, position)
);
CREATE INDEX idx_meet_play_game ON MeetPlay(gameId);

CREATE TRIGGER meet_recording_revision AFTER UPDATE OF meetDate, timezone, notes, status ON Meet
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = NEW.id; END;

CREATE TRIGGER revision_meetattendee_insert AFTER INSERT ON MeetAttendee
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = NEW.meetId; END;

CREATE TRIGGER revision_meetattendee_update AFTER UPDATE ON MeetAttendee
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = NEW.meetId; END;

CREATE TRIGGER revision_meetattendee_delete AFTER DELETE ON MeetAttendee
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = OLD.meetId; END;

CREATE TRIGGER revision_meetpersonattendee_insert AFTER INSERT ON MeetPersonAttendee
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = NEW.meetId; END;

CREATE TRIGGER revision_meetpersonattendee_update AFTER UPDATE ON MeetPersonAttendee
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = NEW.meetId; END;

CREATE TRIGGER revision_meetpersonattendee_delete AFTER DELETE ON MeetPersonAttendee
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = OLD.meetId; END;

CREATE TRIGGER revision_meetaccountgame_insert AFTER INSERT ON MeetAccountGame
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = NEW.meetId; END;

CREATE TRIGGER revision_meetaccountgame_update AFTER UPDATE ON MeetAccountGame
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = NEW.meetId; END;

CREATE TRIGGER revision_meetaccountgame_delete AFTER DELETE ON MeetAccountGame
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = OLD.meetId; END;

CREATE TRIGGER revision_meetpersongame_insert AFTER INSERT ON MeetPersonGame
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = NEW.meetId; END;

CREATE TRIGGER revision_meetpersongame_update AFTER UPDATE ON MeetPersonGame
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = NEW.meetId; END;

CREATE TRIGGER revision_meetpersongame_delete AFTER DELETE ON MeetPersonGame
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = OLD.meetId; END;

CREATE TRIGGER revision_meetgame_insert AFTER INSERT ON MeetGame
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = NEW.meetId; END;

CREATE TRIGGER revision_meetgame_update AFTER UPDATE ON MeetGame
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = NEW.meetId; END;

CREATE TRIGGER revision_meetgame_delete AFTER DELETE ON MeetGame
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = OLD.meetId; END;

CREATE TRIGGER revision_meetgameresult_insert AFTER INSERT ON MeetGameResult
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = NEW.meetId; END;

CREATE TRIGGER revision_meetgameresult_update AFTER UPDATE ON MeetGameResult
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = NEW.meetId; END;

CREATE TRIGGER revision_meetgameresult_delete AFTER DELETE ON MeetGameResult
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = OLD.meetId; END;

CREATE TRIGGER revision_meetplay_insert AFTER INSERT ON MeetPlay
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = NEW.meetId; END;

CREATE TRIGGER revision_meetplay_update AFTER UPDATE ON MeetPlay
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = NEW.meetId; END;

CREATE TRIGGER revision_meetplay_delete AFTER DELETE ON MeetPlay
BEGIN UPDATE Meet SET recordingRevision = recordingRevision + 1 WHERE id = OLD.meetId; END;
