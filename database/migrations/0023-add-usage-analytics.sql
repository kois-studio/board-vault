-- Product analytics of our own (#152, ADR-0021). UsageEvent holds what people
-- do, under a pseudonym (an HMAC of the account id computed by the API), for
-- 30 days at most. UsageDaily keeps anonymous daily counts after that, with no
-- pseudonym, account, group or game. UsageOptOut lists the accounts that turned
-- analytics off in Settings; nothing is recorded for them.
-- `view` and `fromView` are route templates (`/groups/:groupId`), never ids.
-- Rollback: DROP TABLE UsageEvent; DROP TABLE UsageDaily; DROP TABLE UsageOptOut;
-- (only analytics read them; the app works the same without them).

CREATE TABLE UsageEvent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    pseudonym TEXT NOT NULL,
    view TEXT,
    fromView TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_event_created ON UsageEvent(createdAt);
CREATE INDEX idx_usage_event_pseudonym ON UsageEvent(pseudonym);

CREATE TABLE UsageDaily (
    day TEXT NOT NULL,
    name TEXT NOT NULL,
    view TEXT NOT NULL DEFAULT '',
    events INTEGER NOT NULL,
    people INTEGER NOT NULL,
    PRIMARY KEY (day, name, view)
);

CREATE TABLE UsageOptOut (
    accountId INTEGER PRIMARY KEY REFERENCES Account(id) ON DELETE CASCADE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
