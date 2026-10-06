-- Board Vault's own copy of each game's artwork (#98, ADR-0015), until it
-- moves to object storage (#97). One compressed WebP per game. Game.imageUrl
-- then holds the address the API serves it from, `/artwork/<gameId>-<hash>.webp`;
-- the hash changes with the bytes, so the address can be cached for good.
-- sourceUrl is where the image was copied from, or NULL for an upload.
-- Rollback: UPDATE Game SET imageUrl = COALESCE((SELECT sourceUrl FROM GameArtwork
--   WHERE gameId = Game.id), '') WHERE imageUrl LIKE '/artwork/%';
--   then DROP TABLE GameArtwork; (no other table depends on it).

CREATE TABLE GameArtwork (
    gameId INTEGER PRIMARY KEY,
    hash TEXT NOT NULL,
    contentType TEXT NOT NULL CHECK (contentType IN ('image/webp')),
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    bytes BLOB NOT NULL,
    sourceUrl TEXT,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gameId) REFERENCES Game(id) ON DELETE CASCADE
);
