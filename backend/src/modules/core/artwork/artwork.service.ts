import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

import { ArtworkError, processArtwork, storedArtworkPath } from '../../../common/artwork/artwork.js'
import { DatabaseService } from '../../common/database/database.service.js'

import { ArtworkDownloader } from './artwork-downloader.js'

import type { StoredArtwork } from '../../common/database/queries/artwork.queries.js'

/** What an admin asked for a game's artwork: keep it, remove it, or copy a new one. */
export type ArtworkChange = { kind: 'keep' } | { kind: 'remove' } | { kind: 'replace'; artwork: StoredArtwork }

/**
 * Game artwork Board Vault keeps itself (ADR-0015): copied from an address or an upload when an
 * admin saves a game, stored compressed in `GameArtwork`, and served from `/artwork/…`.
 */
@Injectable()
export class ArtworkService {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly downloader: ArtworkDownloader,
    ) {}

    /** Downloads and compresses the image at an address; the admin sees why it failed. */
    async copyFromAddress(address: string): Promise<StoredArtwork> {
        return this.asBadRequest(async () => ({
            ...(await processArtwork(await this.downloader.download(address))),
            sourceUrl: address.trim(),
        }))
    }

    /** Compresses an uploaded image. */
    async copyFromUpload(bytes: Buffer): Promise<StoredArtwork> {
        return this.asBadRequest(async () => ({ ...(await processArtwork(bytes)), sourceUrl: null }))
    }

    /**
     * Reads the artwork field of an admin form against the game's current artwork: empty removes it,
     * the address the form was given keeps it, any other address is copied.
     */
    async resolveChange(value: string | undefined, currentImageUrl: string): Promise<ArtworkChange> {
        if (value === undefined) return { kind: 'keep' }

        const trimmed = value.trim()

        if (!trimmed) return currentImageUrl ? { kind: 'remove' } : { kind: 'keep' }
        if (trimmed === currentImageUrl || (storedArtworkPath(trimmed) !== null && storedArtworkPath(trimmed) === currentImageUrl)) {
            return { kind: 'keep' }
        }

        return { kind: 'replace', artwork: await this.copyFromAddress(trimmed) }
    }

    /**
     * The stored image of a game. `current` is false when the address names an older image: the
     * caller serves today's image without long caching.
     */
    async getForServing(gameId: number, hash: string): Promise<{ bytes: Buffer; contentType: string; current: boolean }> {
        const row = (await this.databaseService.artwork.getGameArtwork(gameId)).rows[0]

        if (!row) throw new NotFoundException('This game has no artwork.')

        return {
            bytes: Buffer.from(row['bytes'] as ArrayBuffer),
            contentType: String(row['contentType']),
            current: String(row['hash']) === hash,
        }
    }

    async getSource(gameId: number): Promise<string | null> {
        const row = (await this.databaseService.artwork.getGameArtworkSource(gameId)).rows[0]

        return row?.['sourceUrl'] ? String(row['sourceUrl']) : null
    }

    private async asBadRequest<T>(work: () => Promise<T>): Promise<T> {
        try {
            return await work()
        } catch (error) {
            if (error instanceof ArtworkError) throw new BadRequestException(`Artwork: ${error.message}`)
            throw error
        }
    }
}
