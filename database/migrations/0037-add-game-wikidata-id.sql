-- Game.wikidataId (#359, ADR-0030): the Wikidata item a catalogue game was
-- seeded from or matched to, such as 'Q17271'. The catalogue import (#361)
-- uses it to update a game it already added instead of adding it again.
-- NULL for games that came only through proposals. Nothing at runtime reads
-- Wikidata; this is a reference, not a dependency.
--
-- Additive: a nullable column and a unique index. Code deployed before this
-- migration never reads the column, so deploy order does not matter; only
-- /health/ready (schema: down) notices the gap.
--
-- Rollback: DROP INDEX Game_wikidataId;
--           ALTER TABLE Game DROP COLUMN wikidataId;

ALTER TABLE Game ADD COLUMN wikidataId TEXT
    CHECK (wikidataId IS NULL OR (wikidataId GLOB 'Q[1-9]*' AND substr(wikidataId, 2) NOT GLOB '*[^0-9]*'));

CREATE UNIQUE INDEX Game_wikidataId ON Game(wikidataId) WHERE wikidataId IS NOT NULL;
