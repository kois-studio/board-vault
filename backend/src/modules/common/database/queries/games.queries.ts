import { BadRequestException, NotFoundException } from '@nestjs/common'

import type { SupportedLanguage } from '../../../../common/types/game-translation.type.js'
import type { BrowseSort, GameLength } from '../../../../common/types/game.type.js'
import type { CreateNotificationBody } from '../../../../common/types/notification.type.js'
import type { DatabaseService } from '../database.service.js'
import type { InValue } from '@libsql/client'

export type CatalogueFilters = {
    /** Normalized title fragment; empty matches every game. */
    search: string
    players?: number
    length?: GameLength
    /** A game must have every one of these tags. */
    tagIds: number[]
    /** Leave out the games this account owns. */
    hideOwnedBy?: number
}

/** Average length in minutes. The ranges meet without overlapping. */
const CATALOGUE_LENGTH: Record<GameLength, string> = {
    short: 'g.gameAvgDuration < 30',
    medium: 'g.gameAvgDuration BETWEEN 30 AND 60',
    long: 'g.gameAvgDuration > 60 AND g.gameAvgDuration <= 120',
    epic: 'g.gameAvgDuration > 120',
}

const CATALOGUE_ORDER: Record<BrowseSort, string> = {
    title: 't.title COLLATE NOCASE ASC, g.id ASC',
    shortest: 'g.gameAvgDuration IS NULL, g.gameAvgDuration ASC, t.title COLLATE NOCASE ASC, g.id ASC',
    newest: 'g.id DESC',
}

/** The game catalogue: games, translations, tags, and proposals. */
export class GameQueries {
    constructor(private readonly database: DatabaseService) {}

    async approveGameProposalAtomically(input: {
        proposalId: number
        reviewerId: number
        title: string
        imageUrl: string
        gameAvgDuration: number
        minPlayers: number
        maxPlayers: number
        translations: Array<{ languageCode: SupportedLanguage; title: string; normalizedTitle: string }>
        tagIds: number[]
        reviewNotes?: string
        notification: CreateNotificationBody
    }): Promise<{ createdGameId: number }> {
        const transaction = await this.database.transaction('write')

        try {
            const gameResult = await transaction.execute({
                sql: 'INSERT INTO Game (imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES (?, ?, ?, ?)',
                args: [input.imageUrl, input.gameAvgDuration, input.minPlayers, input.maxPlayers],
            })
            const createdGameId = Number(gameResult.lastInsertRowid)

            for (const translation of input.translations) {
                await transaction.execute({
                    sql: 'INSERT OR REPLACE INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (?, ?, ?, ?)',
                    args: [createdGameId, translation.languageCode, translation.title, translation.normalizedTitle],
                })
            }

            for (const tagId of input.tagIds) {
                await transaction.execute({
                    sql: 'INSERT OR IGNORE INTO GameTag (gameId, tagId) VALUES (?, ?)',
                    args: [createdGameId, tagId],
                })
            }

            const proposalResult = await transaction.execute({
                sql: `
                    UPDATE GameProposal
                    SET status = 'approved',
                        reviewedBy = ?,
                        reviewedAt = CURRENT_TIMESTAMP,
                        reviewNotes = ?,
                        createdGameId = ?
                    WHERE id = ? AND status = 'pending'
                `,
                args: [input.reviewerId, input.reviewNotes ?? null, createdGameId, input.proposalId],
            })

            if (proposalResult.rowsAffected !== 1) {
                throw new NotFoundException('Pending game proposal not found')
            }

            // The proposer asked for the game on their shelf or wishlist: add it in the same transaction.
            const proposal = await transaction.execute({
                sql: 'SELECT submittedBy, addTo FROM GameProposal WHERE id = ?',
                args: [input.proposalId],
            })
            const submittedBy = Number(proposal.rows[0]?.[0])
            const addTo = proposal.rows[0]?.[1]

            if (addTo === 'shelf' || addTo === 'wishlist') {
                await transaction.execute({
                    sql:
                        addTo === 'shelf'
                            ? 'INSERT INTO OwnedGame (accountId, gameId) VALUES (?, ?)'
                            : 'INSERT INTO WishlistedGame (accountId, gameId) VALUES (?, ?)',
                    args: [submittedBy, createdGameId],
                })
                await transaction.execute({
                    sql: 'INSERT INTO CollectionActivity (accountId, gameId, actionType, actionDetails) VALUES (?, ?, ?, ?)',
                    args: [submittedBy, createdGameId, addTo === 'shelf' ? 'added' : 'wishlisted', null],
                })
                await transaction.execute({
                    sql: `
                        DELETE FROM CollectionActivity
                        WHERE accountId = ?
                          AND id NOT IN (SELECT id FROM CollectionActivity WHERE accountId = ? ORDER BY id DESC LIMIT 32)
                    `,
                    args: [submittedBy, submittedBy],
                })
            }

            await transaction.execute({
                sql: 'INSERT INTO Notification (accountId, type, message, data) VALUES (?, ?, ?, ?)',
                args: [
                    input.notification.accountId,
                    input.notification.type,
                    input.notification.message,
                    JSON.stringify({ ...(input.notification.data || {}), createdGameId }),
                ],
            })

            await transaction.commit()
            return { createdGameId }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    /** Rejects a pending proposal or marks it as a duplicate, and tells the proposer, in one transaction. */
    async closeGameProposalAtomically(input: {
        proposalId: number
        status: 'rejected' | 'duplicate'
        reviewerId: number
        reviewNotes: string | null
        notification: CreateNotificationBody
    }): Promise<void> {
        const transaction = await this.database.transaction('write')

        try {
            const proposalResult = await transaction.execute({
                sql: `
                    UPDATE GameProposal
                    SET status = ?,
                        reviewedBy = ?,
                        reviewedAt = CURRENT_TIMESTAMP,
                        reviewNotes = ?
                    WHERE id = ? AND status = 'pending'
                `,
                args: [input.status, input.reviewerId, input.reviewNotes, input.proposalId],
            })

            if (proposalResult.rowsAffected !== 1) {
                throw new NotFoundException('Pending game proposal not found')
            }

            await transaction.execute({
                sql: 'INSERT INTO Notification (accountId, type, message, data) VALUES (?, ?, ?, ?)',
                args: [
                    input.notification.accountId,
                    input.notification.type,
                    input.notification.message,
                    JSON.stringify(input.notification.data || {}),
                ],
            })

            await transaction.commit()
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    getGameById(id: number) {
        return this.database.execute({
            sql: 'SELECT * FROM Game WHERE id = ?',
            args: [id],
        })
    }

    getGames() {
        return this.database.execute('SELECT * FROM Game ORDER BY id')
    }

    async createGame(gameData: { title: string; imageUrl: string; gameAvgDuration: number; minPlayers: number; maxPlayers: number }) {
        await this.database.execute({
            sql: 'INSERT INTO Game (imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES (?, ?, ?, ?)',
            args: [gameData.imageUrl, gameData.gameAvgDuration, gameData.minPlayers, gameData.maxPlayers],
        })
    }

    getGamesByIds(ids: Array<number>) {
        return this.database.execute({
            sql: `SELECT * FROM Game WHERE id IN (${ids.map(() => '?').join(', ')})`,
            args: ids,
        })
    }

    getGameTranslationsByGameIds(gameIds: Array<number>) {
        return this.database.execute({
            sql: `SELECT * FROM GameTranslation WHERE gameId IN (${gameIds.map(() => '?').join(', ')})`,
            args: gameIds,
        })
    }

    getGameTranslations(gameId: number) {
        return this.database.execute({
            sql: 'SELECT * FROM GameTranslation WHERE gameId = ?',
            args: [gameId],
        })
    }

    createGameTranslation(gameId: number, languageCode: string, title: string, normalizedTitle: string) {
        return this.database.execute({
            sql: 'INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (?, ?, ?, ?)',
            args: [gameId, languageCode, title, normalizedTitle],
        })
    }

    upsertGameTranslation(gameId: number, languageCode: string, title: string, normalizedTitle: string) {
        return this.database.execute({
            sql: 'INSERT OR REPLACE INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (?, ?, ?, ?)',
            args: [gameId, languageCode, title, normalizedTitle],
        })
    }

    /** One page of catalogue game ids, filtered and sorted for Browse. */
    browseCatalogue(filters: CatalogueFilters & { sort: BrowseSort; skip: number; take: number }) {
        const { where, args } = this.catalogueWhere(filters)

        return this.database.execute({
            sql: `
                SELECT g.id FROM Game g
                JOIN GameTranslation t ON t.gameId = g.id AND t.languageCode = 'en'
                ${where}
                ORDER BY ${CATALOGUE_ORDER[filters.sort]}
                LIMIT ? OFFSET ?
            `,
            args: [...args, filters.take, filters.skip],
        })
    }

    countCatalogue(filters: CatalogueFilters) {
        const { where, args } = this.catalogueWhere(filters)

        return this.database.execute({
            sql: `
                SELECT COUNT(*) AS total FROM Game g
                JOIN GameTranslation t ON t.gameId = g.id AND t.languageCode = 'en'
                ${where}
            `,
            args,
        })
    }

    /** Tags used by at least one game, with their category and how many games have them. */
    getCatalogueTags() {
        return this.database.execute(`
            SELECT tag.id, tag.name, category.name AS categoryName, COUNT(gameTag.gameId) AS gameCount
            FROM Tag tag
            JOIN TagCategory category ON category.id = tag.categoryId
            JOIN GameTag gameTag ON gameTag.tagId = tag.id
            GROUP BY tag.id
            ORDER BY category.name, tag.name
        `)
    }

    private catalogueWhere(filters: CatalogueFilters): { where: string; args: Array<InValue> } {
        const conditions: Array<string> = []
        const args: Array<InValue> = []

        if (filters.search) {
            // Any translation matches, so a Spanish title finds the game too.
            conditions.push('EXISTS (SELECT 1 FROM GameTranslation s WHERE s.gameId = g.id AND s.normalizedTitle LIKE ?)')
            args.push(`%${filters.search}%`)
        }
        if (filters.players !== undefined) {
            conditions.push('g.minPlayers <= ? AND g.maxPlayers >= ?')
            args.push(filters.players, filters.players)
        }
        if (filters.length) {
            conditions.push(CATALOGUE_LENGTH[filters.length])
        }
        if (filters.tagIds.length > 0) {
            conditions.push(
                `g.id IN (SELECT gameId FROM GameTag WHERE tagId IN (${filters.tagIds.map(() => '?').join(', ')}) GROUP BY gameId HAVING COUNT(DISTINCT tagId) = ?)`,
            )
            args.push(...filters.tagIds, new Set(filters.tagIds).size)
        }
        if (filters.hideOwnedBy !== undefined) {
            conditions.push('NOT EXISTS (SELECT 1 FROM OwnedGame o WHERE o.gameId = g.id AND o.accountId = ?)')
            args.push(filters.hideOwnedBy)
        }

        return { where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '', args }
    }

    browseGamesMultiLanguage(options: { search: string; skip: number; take: number; excludeGameIds: number[] }) {
        const { search, skip, take, excludeGameIds } = options

        // Building the query parts
        const whereConditions = []
        const queryArgs: Array<InValue> = []

        // Add search condition if provided
        if (search && search.trim() !== '') {
            whereConditions.push('normalizedTitle LIKE ?')
            queryArgs.push(`%${search}%`)
        }

        // Add exclusion condition if game IDs to exclude are provided
        if (excludeGameIds.length > 0) {
            whereConditions.push(`gameId NOT IN (${excludeGameIds.map(() => '?').join(', ')})`)
            queryArgs.push(...excludeGameIds)
        }

        // Combine WHERE conditions if any
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

        // Main query for fetching games with pagination
        // Using DISTINCT to avoid duplicates when a game has translations in multiple languages
        const sql = `
            SELECT DISTINCT gameId FROM GameTranslation 
            ${whereClause}
            ORDER BY gameId ASC
            LIMIT ? OFFSET ?
        `

        // Add pagination params
        queryArgs.push(take, skip)

        return this.database.execute({
            sql,
            args: queryArgs,
        })
    }

    countGamesMultiLanguage(options: { search: string; excludeGameIds: number[] }) {
        const { search, excludeGameIds } = options

        // Building the query parts
        const whereConditions = []
        const queryArgs: Array<InValue> = []

        // Add search condition if provided
        if (search && search.trim() !== '') {
            whereConditions.push('normalizedTitle LIKE ?')
            queryArgs.push(`%${search}%`)
        }

        // Add exclusion condition if game IDs to exclude are provided
        if (excludeGameIds.length > 0) {
            whereConditions.push(`gameId NOT IN (${excludeGameIds.map(() => '?').join(', ')})`)
            queryArgs.push(...excludeGameIds)
        }

        // Combine WHERE conditions if any
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

        // Query for counting total games matching criteria
        // Using COUNT(DISTINCT gameId) to count unique games, not translations
        const sql = `
            SELECT COUNT(DISTINCT gameId) as total FROM GameTranslation
            ${whereClause}
        `

        return this.database.execute({
            sql,
            args: queryArgs,
        })
    }

    getTags() {
        return this.database.execute('SELECT * FROM Tag')
    }

    getTagById(tagId: number) {
        return this.database.execute({
            sql: 'SELECT * FROM Tag WHERE id = ?',
            args: [tagId],
        })
    }

    createTag(name: string, categoryId: number) {
        return this.database.execute({
            sql: 'INSERT INTO Tag (name, categoryId) VALUES (?, ?)',
            args: [name, categoryId],
        })
    }

    updateTag(id: number, name: string, categoryId: number) {
        return this.database.execute({
            sql: 'UPDATE Tag SET name = ?, categoryId = ? WHERE id = ?',
            args: [name, categoryId, id],
        })
    }

    deleteTag(id: number) {
        return this.database.execute({
            sql: 'DELETE FROM Tag WHERE id = ?',
            args: [id],
        })
    }

    getTagCategories() {
        return this.database.execute('SELECT * FROM TagCategory')
    }

    getTagCategoryById(id: number) {
        return this.database.execute({
            sql: 'SELECT * FROM TagCategory WHERE id = ?',
            args: [id],
        })
    }

    createTagCategory(name: string) {
        return this.database.execute({
            sql: 'INSERT INTO TagCategory (name) VALUES (?)',
            args: [name],
        })
    }

    updateTagCategory(id: number, name: string) {
        return this.database.execute({
            sql: 'UPDATE TagCategory SET name = ? WHERE id = ?',
            args: [name, id],
        })
    }

    deleteTagCategory(id: number) {
        return this.database.execute({
            sql: 'DELETE FROM TagCategory WHERE id = ?',
            args: [id],
        })
    }

    getGameTags(gameId: number) {
        return this.database.execute({
            sql: `
            SELECT
                gt.gameId,
                gt.tagId
            FROM
                GameTag gt
            WHERE
                gt.gameId = ?;
            `,
            args: [gameId],
        })
    }

    /** Categories with their tag ids (as a JSON array) and how many distinct games use any of their tags. */
    getTagCategoriesWithTags(categoryId: number | null = null) {
        return this.database.execute({
            sql: `
            SELECT
                category.id,
                category.name,
                (SELECT json_group_array(tagId) FROM (SELECT tag.id AS tagId FROM Tag tag WHERE tag.categoryId = category.id ORDER BY tag.id)) AS tagIds,
                (
                    SELECT COUNT(DISTINCT gameTag.gameId)
                    FROM GameTag gameTag
                    JOIN Tag tag ON tag.id = gameTag.tagId
                    WHERE tag.categoryId = category.id
                ) AS gameCount
            FROM
                TagCategory category
            WHERE
                ?1 IS NULL OR category.id = ?1
            ORDER BY
                category.id;
            `,
            args: [categoryId],
        })
    }

    getGameCountByTagId(tagId: number) {
        return this.database.execute({
            sql: `SELECT COUNT(*) FROM GameTag WHERE tagId = ?`,
            args: [tagId],
        })
    }

    addGameTag(gameId: number, tagId: number) {
        return this.database.execute({
            sql: 'INSERT INTO GameTag (gameId, tagId) VALUES (?, ?)',
            args: [gameId, tagId],
        })
    }

    removeGameTag(gameId: number, tagId: number) {
        return this.database.execute({
            sql: 'DELETE FROM GameTag WHERE gameId = ? AND tagId = ?',
            args: [gameId, tagId],
        })
    }

    getGameProposals() {
        return this.database.execute('SELECT * FROM GameProposal ORDER BY submittedAt DESC, id DESC')
    }

    getGameProposalById(id: number) {
        return this.database.execute({
            sql: 'SELECT * FROM GameProposal WHERE id = ?',
            args: [id],
        })
    }

    getGameProposalsByStatus(status: 'pending' | 'approved' | 'rejected' | 'duplicate') {
        return this.database.execute({
            sql: 'SELECT * FROM GameProposal WHERE status = ? ORDER BY submittedAt DESC, id DESC',
            args: [status],
        })
    }

    getGameProposalsBySubmitter(submittedBy: number) {
        return this.database.execute({
            sql: 'SELECT * FROM GameProposal WHERE submittedBy = ? ORDER BY submittedAt DESC, id DESC',
            args: [submittedBy],
        })
    }

    /** Saves a proposal and tells every other active admin about it, atomically. */
    async createGameProposal(proposalData: {
        submittedBy: number
        title: string
        imageUrl?: string
        gameAvgDuration?: number
        minPlayers?: number
        maxPlayers?: number
        proposedTags?: string
        notes?: string
        addTo: 'shelf' | 'wishlist' | null
        adminNotification: { type: string; message: string; data: Record<string, unknown> }
    }): Promise<{ proposalId: number }> {
        const { submittedBy, title, imageUrl, gameAvgDuration, minPlayers, maxPlayers, proposedTags, notes, addTo, adminNotification } =
            proposalData
        const transaction = await this.database.transaction('write')

        try {
            const inserted = await transaction.execute({
                sql: `
                    INSERT INTO GameProposal (
                        submittedBy, title, imageUrl, gameAvgDuration,
                        minPlayers, maxPlayers, proposedTags, notes, addTo
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                args: [
                    submittedBy,
                    title,
                    imageUrl || null,
                    gameAvgDuration || null,
                    minPlayers || null,
                    maxPlayers || null,
                    proposedTags || null,
                    notes || null,
                    addTo,
                ],
            })
            const proposalId = Number(inserted.lastInsertRowid)

            await transaction.execute({
                sql: `
                    INSERT INTO Notification (accountId, type, message, data)
                    SELECT id, ?, ?, ?
                    FROM Account
                    WHERE isAdmin = 1 AND isDeleted = 0 AND id != ?
                `,
                args: [
                    adminNotification.type,
                    adminNotification.message,
                    JSON.stringify({ ...adminNotification.data, proposalId }),
                    submittedBy,
                ],
            })

            await transaction.commit()
            return { proposalId }
        } catch (error) {
            await transaction.rollback()
            throw error
        } finally {
            transaction.close()
        }
    }

    async updateGameProposal(
        id: number,
        updateData: {
            status?: 'pending' | 'approved' | 'rejected' | 'duplicate'
            reviewedBy?: number
            reviewNotes?: string
            createdGameId?: number
        },
    ) {
        const { status, reviewedBy, reviewNotes, createdGameId } = updateData

        const fields = []
        const args = []

        if (status !== undefined) {
            fields.push('status = ?')
            args.push(status)
        }

        if (reviewedBy !== undefined) {
            fields.push('reviewedBy = ?')
            args.push(reviewedBy)
        }

        if (reviewNotes !== undefined) {
            fields.push('reviewNotes = ?')
            args.push(reviewNotes)
        }

        if (createdGameId !== undefined) {
            fields.push('createdGameId = ?')
            args.push(createdGameId)
        }

        // If any review fields are being set, also set reviewedAt
        if (reviewedBy !== undefined || reviewNotes !== undefined || status !== undefined) {
            fields.push('reviewedAt = CURRENT_TIMESTAMP')
        }

        if (fields.length === 0) {
            throw new BadRequestException('No fields to update')
        }

        args.push(id)

        const sql = `
            UPDATE GameProposal
            SET ${fields.join(', ')}
            WHERE id = ?
        `

        await this.database.execute({ sql, args })

        return this.getGameProposalById(id)
    }

    deleteGameProposalById(id: number) {
        return this.database.execute({
            sql: 'DELETE FROM GameProposal WHERE id = ?',
            args: [id],
        })
    }
}
