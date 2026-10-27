-- A game's editions (ADR-0025, #186): each a published version in one
-- language, with its own key so OwnedGame can point at one later (#188).
-- Copies every GameTranslation row. The English row is primary; a game
-- without one gets its first row by language code. GameTranslation stays,
-- and the API keeps writing it, until a later migration drops it.
-- One edition per language and one primary per game are unique indexes,
-- not table constraints, so either can be dropped without a rebuild.
-- Rollback: DROP TABLE GameEdition; (the API reads GameTranslation again).

CREATE TABLE GameEdition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gameId INTEGER NOT NULL REFERENCES Game(id) ON DELETE CASCADE,
    languageCode TEXT NOT NULL,
    title TEXT NOT NULL,
    normalizedTitle TEXT NOT NULL,
    isPrimary INTEGER NOT NULL DEFAULT 0 CHECK (isPrimary IN (0, 1))
);

CREATE UNIQUE INDEX GameEdition_game_language ON GameEdition (gameId, languageCode);
CREATE UNIQUE INDEX GameEdition_one_primary ON GameEdition (gameId) WHERE isPrimary = 1;
CREATE INDEX GameEdition_normalized_title ON GameEdition (normalizedTitle);

INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary)
SELECT gameId, languageCode, title, normalizedTitle,
       CASE WHEN ROW_NUMBER() OVER (
           PARTITION BY gameId
           ORDER BY CASE WHEN languageCode = 'en' THEN 0 ELSE 1 END, languageCode
       ) = 1 THEN 1 ELSE 0 END
FROM GameTranslation
ORDER BY gameId, languageCode;
