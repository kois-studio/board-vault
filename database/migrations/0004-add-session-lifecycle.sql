-- Canonical session lifecycle fields.
--
-- Existing Meet rows represent historical completed play records, so the
-- additive default is completed. New session APIs may use scheduled, active,
-- completed, or cancelled explicitly.

ALTER TABLE Meet ADD COLUMN status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled'));

ALTER TABLE Meet ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';

-- SQLite does not allow a non-constant default in ALTER TABLE. The backend
-- supplies updatedAt explicitly for new writes; legacy rows remain nullable.
ALTER TABLE Meet ADD COLUMN updatedAt DATETIME;

CREATE INDEX idx_meet_status_date
    ON Meet(status, meetDate);
