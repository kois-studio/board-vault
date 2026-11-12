-- Problem reports (#247, ADR-0028). When something breaks for someone (an
-- error in the app, a page whose code fails to load, a request the API could
-- not answer, an unexpected exception in the API), a scrubbed report is kept
-- so we learn of it without waiting to be told.
--
-- One row per distinct problem per day (`fingerprint`, a hash of where and
-- what), with how many times it happened and the latest sample. No account,
-- pseudonym, IP address or user agent: the browser is kept only as a family,
-- major version and system ("Firefox 133 · Windows"). The API caps how many
-- distinct problems a day can add, and the daily job deletes rows older than
-- 30 days.
--
-- Rollback: DROP INDEX ProblemReport_lastSeenAt;
--           DROP TABLE ProblemReport;

CREATE TABLE ProblemReport (
    id INTEGER PRIMARY KEY,
    day TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('app', 'api')),
    kind TEXT NOT NULL CHECK (kind IN ('error', 'rejection', 'chunk', 'request', 'exception')),
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    stack TEXT,
    view TEXT,
    endpoint TEXT,
    status INTEGER,
    requestId TEXT,
    release TEXT,
    locale TEXT,
    browser TEXT,
    occurrences INTEGER NOT NULL DEFAULT 1 CHECK (occurrences > 0),
    firstSeenAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lastSeenAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (day, fingerprint)
);

CREATE INDEX ProblemReport_lastSeenAt ON ProblemReport (lastSeenAt);
