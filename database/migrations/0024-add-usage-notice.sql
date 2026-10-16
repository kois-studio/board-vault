-- Tell everyone about usage analytics once, with the switch right there (#158,
-- ADR-0021). UsageNotice lists the accounts that answered the notice: the card
-- in the app, the switch on the invitation sign-up form, or the switch in
-- Settings → Privacy. An account without a row sees the card.
-- Rollback: DROP TABLE UsageNotice; (everyone sees the card once more; nothing
-- else reads it).

CREATE TABLE UsageNotice (
    accountId INTEGER PRIMARY KEY REFERENCES Account(id) ON DELETE CASCADE,
    answeredAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
