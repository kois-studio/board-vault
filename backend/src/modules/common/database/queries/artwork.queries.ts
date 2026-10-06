import { artworkPath, type ProcessedArtwork } from '../../../../common/artwork/artwork.js'

import type { DatabaseService } from '../database.service.js'
import type { InStatement } from '@libsql/client'

/** Artwork to store for a game, with where it was copied from (null for an upload). */
export type StoredArtwork = ProcessedArtwork & { sourceUrl: string | null }

/**
 * The statements that give a game its artwork, or take it away (null): the stored image and
 * `Game.imageUrl` change together. Run them inside the caller's transaction.
 */
export function gameArtworkStatements(gameId: number, artwork: StoredArtwork | null): Array<InStatement> {
    if (!artwork) {
        return [
            { sql: 'DELETE FROM GameArtwork WHERE gameId = ?', args: [gameId] },
            { sql: "UPDATE Game SET imageUrl = '' WHERE id = ?", args: [gameId] },
        ]
    }

    return [
        {
            sql: `
                INSERT INTO GameArtwork (gameId, hash, contentType, width, height, bytes, sourceUrl, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (gameId) DO UPDATE SET
                    hash = excluded.hash,
                    contentType = excluded.contentType,
                    width = excluded.width,
                    height = excluded.height,
                    bytes = excluded.bytes,
                    sourceUrl = excluded.sourceUrl,
                    updatedAt = excluded.updatedAt
            `,
            args: [gameId, artwork.hash, artwork.contentType, artwork.width, artwork.height, artwork.bytes, artwork.sourceUrl],
        },
        { sql: 'UPDATE Game SET imageUrl = ? WHERE id = ?', args: [artworkPath(gameId, artwork.hash), gameId] },
    ]
}

export class ArtworkQueries {
    constructor(private readonly database: DatabaseService) {}

    /** The stored image of a game, to serve it. */
    getGameArtwork(gameId: number) {
        return this.database.execute({
            sql: 'SELECT hash, contentType, bytes FROM GameArtwork WHERE gameId = ?',
            args: [gameId],
        })
    }

    /** Where a game's stored artwork was copied from, for the admin. */
    getGameArtworkSource(gameId: number) {
        return this.database.execute({
            sql: 'SELECT sourceUrl FROM GameArtwork WHERE gameId = ?',
            args: [gameId],
        })
    }

    /** Gives a game its artwork, or takes it away, in one transaction. */
    async setGameArtwork(gameId: number, artwork: StoredArtwork | null): Promise<void> {
        const transaction = await this.database.transaction('write')

        try {
            for (const statement of gameArtworkStatements(gameId, artwork)) await transaction.execute(statement)
            await transaction.commit()
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    }
}
