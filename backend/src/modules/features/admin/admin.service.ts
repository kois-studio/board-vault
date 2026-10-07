import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator.js'
import { structuredLog } from '../../../common/logging/structured-log.js'
import {
    AdminGameDto,
    AdminGamesQuery,
    AdminOverviewDto,
    CATALOGUE_QUALITY_ISSUES,
    MergeTagResultDto,
    UpdateAdminGameBody,
    AdminGamesResponseDto,
    ApproveGameProposalBody,
    RejectGameProposalBody,
    AdminGameProposalsResponseDto,
    DuplicateGameProposalBody,
    ProposalStatusCountsDto,
} from '../../../common/types/admin.type.js'
import { GameProposalCompleteDto } from '../../../common/types/game-proposal.type.js'
import { SupportedLanguage } from '../../../common/types/game-translation.type.js'
import { TagDto, GameTagWithCategoryDto } from '../../../common/types/tag.type.js'
import { ArtworkService } from '../../../modules/core/artwork/artwork.service.js'
import { GameProposalService } from '../../../modules/core/game-proposal/game-proposal.service.js'
import { GameTagsService } from '../../../modules/core/game-tags/game-tags.service.js'
import { GameTranslationService } from '../../../modules/core/game-translation/game-translation.service.js'
import { GamesService } from '../../../modules/core/games/games.service.js'
import { NotificationTypeEnum } from '../../../modules/core/notifications/notifications-enum.type.js'
import { TagCategoryService } from '../../../modules/core/tag-category/tag-category.service.js'
import { TagsService } from '../../../modules/core/tags/tags.service.js'
import { CacheService } from '../../common/cache/cache.service.js'
import { DatabaseService } from '../../common/database/database.service.js'

import type { TagCategoryWithTagsDto } from '../../../common/types/tag-category.type.js'

const ADMIN_OVERVIEW_CACHE_KEY = 'admin:overview'

/** Euros as the admin types them, stored as whole cents; null or absent means no price. */
const toCents = (euros: number | null | undefined): number | null =>
    euros === null || euros === undefined ? null : Math.round(euros * 100)

@Injectable()
export class AdminService {
    private readonly LOGGER = new Logger(AdminService.name)

    constructor(
        private readonly tagService: TagsService,
        private readonly gameService: GamesService,
        private readonly gameTagsService: GameTagsService,
        private readonly tagCategoryService: TagCategoryService,
        private readonly gameTranslationService: GameTranslationService,
        private readonly gameProposalService: GameProposalService,
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
        private readonly artworkService: ArtworkService,
    ) {}

    // #region Tag Categories

    @LogFeature(new Logger('AdminService'))
    async getAdminTagCategories(): Promise<TagCategoryWithTagsDto[]> {
        return this.tagCategoryService.getTagCategoriesWithTags()
    }

    // #endregion

    async createTagCategory(name: string): Promise<TagCategoryWithTagsDto> {
        const category = await this.tagCategoryService.createTagCategory(name)

        return this.tagCategoryService.getTagCategoryWithTags(category.id)
    }

    async updateTagCategory(id: number, name: string): Promise<TagCategoryWithTagsDto> {
        await this.tagCategoryService.updateTagCategory(id, name)

        return this.tagCategoryService.getTagCategoryWithTags(id)
    }

    async deleteTagCategory(id: number): Promise<{ success: boolean }> {
        return this.tagCategoryService.deleteTagCategory(id)
    }

    // #region Tags

    @LogFeature(new Logger('AdminService'))
    async getAdminTags(): Promise<TagDto[]> {
        const tags = await this.tagService.getTags()

        return Promise.all(
            tags.map(async tag => {
                const gameCount = await this.gameTagsService.getGameCountByTagId(tag.id)

                return {
                    ...tag,
                    gameCount,
                }
            }),
        )
    }

    // #endregion

    async createTag(name: string, categoryId: number): Promise<TagDto> {
        const tag = await this.tagService.createTag(name, categoryId)
        const gameCount = await this.gameTagsService.getGameCountByTagId(tag.id)

        return {
            ...tag,
            gameCount,
        }
    }

    async updateTag(id: number, name: string, categoryId: number): Promise<TagDto> {
        const tag = await this.tagService.updateTag(id, name, categoryId)
        const gameCount = await this.gameTagsService.getGameCountByTagId(tag.id)

        return {
            ...tag,
            gameCount,
        }
    }

    async deleteTag(id: number): Promise<{ success: boolean }> {
        return this.tagService.deleteTag(id)
    }

    /** Moves every game from one tag to another, then deletes the first; one transaction. */
    async mergeTag(tagId: number, intoTagId: number): Promise<MergeTagResultDto> {
        if (tagId === intoTagId) throw new BadRequestException('A tag cannot be merged into itself.')
        const [tag, into] = await Promise.all([this.tagService.getTagById(tagId), this.tagService.getTagById(intoTagId)])

        const result = await this.databaseService.games.mergeTagAtomically({ tagId, intoTagId })

        await Promise.all([
            this.cacheService.deleteOne(`tags:byCategoryId:${tag.categoryId}`),
            this.cacheService.deleteOne(`tags:byCategoryId:${into.categoryId}`),
        ])

        return result
    }

    // #endregion

    // #region Games

    @LogFeature(new Logger('AdminService'))
    async getAdminGames(query: AdminGamesQuery): Promise<AdminGamesResponseDto> {
        const filters = {
            search: this.gameTranslationService.normalizeTitle(query.search ?? ''),
            players: query.players,
            length: query.length,
            tagIds: query.tags,
            issue: query.issue,
        }

        // Punctuation alone, such as `%%`, normalizes to nothing: a search with no match, not the whole catalogue.
        if (filters.search === '' && query.search?.trim()) {
            return { games: [], pagination: { currentPage: query.page, totalPages: 0, totalItems: 0, itemsPerPage: query.limit } }
        }

        const [page, count] = await Promise.all([
            this.databaseService.games.browseAdminCatalogue({ ...filters, skip: (query.page - 1) * query.limit, take: query.limit }),
            this.databaseService.games.countAdminCatalogue(filters),
        ])
        const totalItems = Number(count.rows[0]?.['total'] ?? 0)

        return {
            games: await this.toAdminGames(page.rows),
            pagination: {
                currentPage: query.page,
                totalPages: Math.ceil(totalItems / query.limit),
                totalItems,
                itemsPerPage: query.limit,
            },
        }
    }

    async getAdminGame(gameId: number): Promise<AdminGameDto> {
        // Throws 404 when the game does not exist.
        await this.gameService.getGameById(gameId)
        const page = await this.databaseService.games.browseAdminCatalogue({ search: '', tagIds: [], skip: 0, take: 1, gameId })
        const [game] = await this.toAdminGames(page.rows)

        if (!game) throw new NotFoundException(`Game with id ${gameId} not found`)

        return game
    }

    /** Saves titles, artwork, players, length and tags of one game together. */
    async updateGame(gameId: number, adminId: number, body: UpdateAdminGameBody): Promise<AdminGameDto> {
        const current = await this.gameService.getGameById(gameId)
        const minPlayers = body.minPlayers ?? current.minPlayers
        const maxPlayers = body.maxPlayers ?? current.maxPlayers

        if (minPlayers > maxPlayers) {
            throw new BadRequestException('minPlayers cannot be greater than maxPlayers.')
        }

        const tagIds = body.tagIds ? [...new Set(body.tagIds)] : undefined

        if (tagIds?.length) await this.assertTagsExist(tagIds)

        const game: Partial<Record<'gameAvgDuration' | 'minPlayers' | 'maxPlayers' | 'retailPriceCents', number | null>> = {}

        if (body.minPlayers !== undefined) game.minPlayers = body.minPlayers
        if (body.maxPlayers !== undefined) game.maxPlayers = body.maxPlayers
        if (body.gameAvgDuration !== undefined) game.gameAvgDuration = body.gameAvgDuration
        if (body.retailPrice !== undefined) game.retailPriceCents = toCents(body.retailPrice)

        const translations: Partial<Record<SupportedLanguage, { title: string; normalizedTitle: string } | null>> = {}

        for (const languageCode of ['en', 'es'] as const) {
            const title = body.translations?.[languageCode]

            if (title === undefined) continue
            const trimmed = title.trim()

            if (!trimmed && languageCode === 'en') throw new BadRequestException('The English title cannot be empty.')
            translations[languageCode] = trimmed
                ? { title: trimmed, normalizedTitle: this.gameTranslationService.normalizeTitle(trimmed) }
                : null
        }

        // Copied before the transaction: a download can take seconds and must not hold the write lock.
        const artwork = await this.artworkService.resolveChange(body.imageUrl, current.imageUrl)

        await this.databaseService.games.updateGameAtomically({
            gameId,
            game,
            artwork: artwork.kind === 'keep' ? undefined : artwork.kind === 'remove' ? null : artwork.artwork,
            translations,
            tagIds,
        })

        await Promise.all([
            this.cacheService.deleteOne(`games:byId:${gameId}`),
            this.cacheService.deleteOne(`game-translation:byGameId:${gameId}`),
            this.cacheService.deleteOne(`game-tags:byGameId:${gameId}`),
        ])

        // Field names only: no titles or URLs in logs.
        const fields = [
            ...Object.keys(game),
            ...(artwork.kind === 'keep' ? [] : ['artwork']),
            ...Object.keys(translations).map(language => `title.${language}`),
            ...(tagIds ? ['tags'] : []),
        ]

        this.LOGGER.log(structuredLog('admin.game.updated', { adminId, gameId, fields }))

        return this.getAdminGame(gameId)
    }

    /** Replaces a game's artwork with an uploaded image, such as a photo of the box. */
    async uploadGameArtwork(gameId: number, adminId: number, bytes: Buffer): Promise<AdminGameDto> {
        // Throws 404 when the game does not exist.
        await this.gameService.getGameById(gameId)

        const artwork = await this.artworkService.copyFromUpload(bytes)

        await this.databaseService.artwork.setGameArtwork(gameId, artwork)
        await this.cacheService.deleteOne(`games:byId:${gameId}`)
        this.LOGGER.log(structuredLog('admin.game.updated', { adminId, gameId, fields: ['artwork'] }))

        return this.getAdminGame(gameId)
    }

    private async assertTagsExist(tagIds: Array<number>): Promise<void> {
        const known = new Set((await this.tagService.getTags()).map(tag => tag.id))
        const unknown = tagIds.filter(tagId => !known.has(tagId))

        if (unknown.length > 0) throw new BadRequestException(`Unknown tag ids: ${unknown.join(', ')}.`)
    }

    private async toAdminGames(rows: Array<Record<string, unknown>>): Promise<Array<AdminGameDto>> {
        const gameIds = rows.map(row => Number(row['id']))
        const tagRows = await this.databaseService.games.getTagsOfGames(gameIds)
        const tagsByGame = new Map<number, Array<GameTagWithCategoryDto>>()

        for (const row of tagRows.rows) {
            const gameId = Number(row['gameId'])

            tagsByGame.set(gameId, [
                ...(tagsByGame.get(gameId) ?? []),
                { id: Number(row['id']), name: String(row['name']), categoryName: String(row['categoryName']) },
            ])
        }

        return rows.map(row => {
            const id = Number(row['id'])
            const titleEn = String(row['titleEn'] ?? '')

            return {
                id,
                title: titleEn,
                imageUrl: String(row['imageUrl'] ?? ''),
                gameAvgDuration: Number(row['gameAvgDuration']),
                minPlayers: Number(row['minPlayers']),
                maxPlayers: Number(row['maxPlayers']),
                translations: { en: titleEn, es: String(row['titleEs'] ?? '') },
                tags: tagsByGame.get(id) ?? [],
                issues: CATALOGUE_QUALITY_ISSUES.filter(issue => Number(row[issue]) === 1),
                artworkSource: row['artworkSource'] ? String(row['artworkSource']) : null,
                retailPrice:
                    row['retailPriceCents'] === null || row['retailPriceCents'] === undefined
                        ? null
                        : Number(row['retailPriceCents']) / 100,
            }
        })
    }

    // #region Overview

    /** What needs doing and the catalogue at a glance, in aggregate counts. Cached for a minute. */
    @LogFeature(new Logger('AdminService'))
    async getOverview(): Promise<AdminOverviewDto> {
        const cached = await this.cacheService.get(ADMIN_OVERVIEW_CACHE_KEY)

        if (cached) return cached as AdminOverviewDto

        const [counts, mostOwned, wantedUnowned, decisions] = await this.databaseService.games.getAdminOverview()
        const row: Record<string, unknown> = counts.rows[0] ?? {}
        const count = (name: string) => Number(row[name] ?? 0)
        const ranked = (rows: Array<Record<string, unknown>>) =>
            rows.map(entry => ({ gameId: Number(entry['gameId']), title: String(entry['title'] ?? ''), count: Number(entry['count']) }))

        const overview: AdminOverviewDto = {
            proposals: {
                pending: count('pendingProposals'),
                oldestPendingAt: row['oldestPendingAt'] ? String(row['oldestPendingAt']) : null,
            },
            catalogueIssues: Object.fromEntries(
                CATALOGUE_QUALITY_ISSUES.map(issue => [issue, count(issue)]),
            ) as AdminOverviewDto['catalogueIssues'],
            tags: { unused: count('unusedTags'), emptyCategories: count('emptyCategories') },
            catalogue: {
                games: count('games'),
                approvedLast30Days: count('approvedLast30Days'),
                mostOwned: ranked(mostOwned.rows),
                mostWantedUnowned: ranked(wantedUnowned.rows),
            },
            recentDecisions: decisions.rows.map(entry => ({
                proposalId: Number(entry['id']),
                title: String(entry['title']),
                status: String(entry['status']) as AdminOverviewDto['recentDecisions'][number]['status'],
                reviewedAt: String(entry['reviewedAt']),
                reviewerName: entry['reviewerName'] ? String(entry['reviewerName']) : null,
                createdGameId: entry['createdGameId'] ? Number(entry['createdGameId']) : null,
            })),
        }

        await this.cacheService.set(ADMIN_OVERVIEW_CACHE_KEY, overview, 'minute')
        return overview
    }

    // #endregion

    // #region Game Proposals

    @LogFeature(new Logger('AdminService'))
    async getAdminGameProposals(
        status?: 'pending' | 'approved' | 'rejected' | 'duplicate',
        page: number = 1,
        limit: number = 10,
    ): Promise<AdminGameProposalsResponseDto> {
        const allProposals = await this.gameProposalService.getGameProposals()
        const statusCounts: ProposalStatusCountsDto = { pending: 0, approved: 0, rejected: 0, duplicate: 0 }

        for (const proposal of allProposals) statusCounts[proposal.status] += 1

        // Newest first, except the pending queue: oldest first, as it should be worked through.
        const proposals = status ? allProposals.filter(proposal => proposal.status === status) : allProposals

        if (status === 'pending') proposals.reverse()

        // Calculate pagination
        const totalItems = proposals.length
        const totalPages = Math.ceil(totalItems / limit)
        const startIndex = (page - 1) * limit
        const endIndex = startIndex + limit
        const paginatedProposals = proposals.slice(startIndex, endIndex)

        // Transform to include submitter and reviewer IDs
        const proposalsWithIds: Array<GameProposalCompleteDto> = paginatedProposals.map(proposal => ({
            ...proposal,
            submitterId: proposal.submittedBy,
            reviewerId: proposal.reviewedBy || undefined,
        }))

        return {
            proposals: proposalsWithIds,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems,
                itemsPerPage: limit,
            },
            statusCounts,
        }
    }

    @LogFeature(new Logger('AdminService'))
    async getAdminGameProposalById(id: number): Promise<GameProposalCompleteDto> {
        const proposal = await this.gameProposalService.getGameProposalById(id)

        return {
            ...proposal,
            submitterId: proposal.submittedBy,
            reviewerId: proposal.reviewedBy || undefined,
        }
    }

    @LogFeature(new Logger('AdminService'))
    async approveGameProposal(
        proposalId: number,
        reviewerId: number,
        approvalData: ApproveGameProposalBody,
    ): Promise<{ success: boolean; createdGameId?: number }> {
        const proposal = await this.gameProposalService.getGameProposalById(proposalId)

        // The game gets exactly the reviewed values: the admin's, or the proposal's. Nothing is guessed,
        // because player counts and length drive Browse filters and suggestions.
        const gameAvgDuration = approvalData.gameAvgDuration ?? proposal.gameAvgDuration
        const minPlayers = approvalData.minPlayers ?? proposal.minPlayers
        const maxPlayers = approvalData.maxPlayers ?? proposal.maxPlayers
        const missing = [
            gameAvgDuration ? null : 'gameAvgDuration',
            minPlayers ? null : 'minPlayers',
            maxPlayers ? null : 'maxPlayers',
        ].filter(field => field !== null)

        if (missing.length > 0) {
            throw new BadRequestException(`The proposal has no ${missing.join(', ')}; set them to approve it.`)
        }
        if (minPlayers! > maxPlayers!) {
            throw new BadRequestException('minPlayers cannot be greater than maxPlayers.')
        }

        const tagIds = [...new Set(approvalData.tagIds ?? [])]

        if (tagIds.length > 0) {
            const known = new Set((await this.tagService.getTags()).map(tag => tag.id))
            const unknown = tagIds.filter(tagId => !known.has(tagId))

            if (unknown.length > 0) throw new BadRequestException(`Unknown tag ids: ${unknown.join(', ')}.`)
        }

        // Empty means no artwork; the frontend shows its own placeholder. Copied before the transaction.
        const artworkAddress = (approvalData.imageUrl ?? proposal.imageUrl ?? '').trim()
        const artwork = artworkAddress ? await this.artworkService.copyFromAddress(artworkAddress) : null

        const gameData = {
            title: proposal.title,
            artwork,
            retailPriceCents: toCents(approvalData.retailPrice),
            gameAvgDuration: gameAvgDuration!,
            minPlayers: minPlayers!,
            maxPlayers: maxPlayers!,
        }

        const titles: Record<SupportedLanguage, string | undefined> = {
            en: approvalData.translations?.en?.trim() || proposal.title,
            es: approvalData.translations?.es?.trim() || undefined,
        }
        const translations = Object.entries(titles)
            .filter((entry): entry is [SupportedLanguage, string] => Boolean(entry[1]))
            .map(([languageCode, title]) => ({ languageCode, title, normalizedTitle: this.gameTranslationService.normalizeTitle(title) }))

        const { createdGameId } = await this.databaseService.games.approveGameProposalAtomically({
            proposalId,
            reviewerId,
            ...gameData,
            translations,
            tagIds,
            reviewNotes: approvalData.reviewNotes,
            notification: {
                accountId: proposal.submittedBy,
                type: NotificationTypeEnum.GAME_PROPOSAL_APPROVED,
                message: `Your game proposal "${proposal.title}" was approved!`,
                // The query adds createdGameId once the game exists, so the notification can link to it.
                data: {
                    gameTitle: proposal.title,
                    proposalId: proposal.id,
                },
            },
        })

        await Promise.all([
            this.cacheService.deleteOne(`game-proposal:byId:${proposalId}`),
            this.cacheService.deleteOne('game-proposal:byStatus:pending'),
            this.cacheService.deleteOne('game-proposal:byStatus:approved'),
            this.cacheService.deleteOne(`game-proposal:bySubmitter:${proposal.submittedBy}`),
            this.cacheService.deleteOne(`user-proposal-stats:${proposal.submittedBy}`),
            // The approval may have put the game on the proposer's shelf or wishlist.
            this.cacheService.deleteOne(`collection-activity:byAccountId:${proposal.submittedBy}`),
        ])

        return { success: true, createdGameId }
    }

    @LogFeature(new Logger('AdminService'))
    async rejectGameProposal(proposalId: number, reviewerId: number, rejectionData: RejectGameProposalBody): Promise<{ success: boolean }> {
        const proposal = await this.gameProposalService.getGameProposalById(proposalId)

        await this.databaseService.games.closeGameProposalAtomically({
            proposalId,
            status: 'rejected',
            reviewerId,
            reviewNotes: rejectionData.reviewNotes,
            notification: {
                accountId: proposal.submittedBy,
                type: NotificationTypeEnum.GAME_PROPOSAL_REJECTED,
                message: `Your game proposal "${proposal.title}" was rejected: ${rejectionData.reviewNotes}`,
                data: {
                    gameTitle: proposal.title,
                    proposalId: proposal.id,
                    reviewNotes: rejectionData.reviewNotes,
                },
            },
        })

        await Promise.all([
            this.cacheService.deleteOne(`game-proposal:byId:${proposalId}`),
            this.cacheService.deleteOne('game-proposal:byStatus:pending'),
            this.cacheService.deleteOne('game-proposal:byStatus:rejected'),
            this.cacheService.deleteOne(`game-proposal:bySubmitter:${proposal.submittedBy}`),
            this.cacheService.deleteOne(`user-proposal-stats:${proposal.submittedBy}`),
        ])

        return { success: true }
    }

    @LogFeature(new Logger('AdminService'))
    async markGameProposalAsDuplicate(
        proposalId: number,
        reviewerId: number,
        body: DuplicateGameProposalBody,
    ): Promise<{ success: boolean }> {
        const proposal = await this.gameProposalService.getGameProposalById(proposalId)

        // Throws 404 when the game does not exist.
        await this.gameService.getGameById(body.duplicateOfGameId)
        const titles = await this.gameTranslationService.getGameTranslations(body.duplicateOfGameId)
        const duplicateOfTitle = titles.en || titles.es || 'a game in the catalogue'
        const reviewNotes = body.reviewNotes?.trim() || null

        await this.databaseService.games.closeGameProposalAtomically({
            proposalId,
            status: 'duplicate',
            reviewerId,
            reviewNotes,
            notification: {
                accountId: proposal.submittedBy,
                type: NotificationTypeEnum.GAME_PROPOSAL_DUPLICATE,
                message: `Your game proposal "${proposal.title}" is already in Board Vault as "${duplicateOfTitle}".${reviewNotes ? ` ${reviewNotes}` : ''}`,
                data: {
                    gameTitle: proposal.title,
                    proposalId: proposal.id,
                    duplicateOfGameId: body.duplicateOfGameId,
                    duplicateOfTitle,
                },
            },
        })

        await Promise.all([
            this.cacheService.deleteOne(`game-proposal:byId:${proposalId}`),
            this.cacheService.deleteOne('game-proposal:byStatus:pending'),
            this.cacheService.deleteOne('game-proposal:byStatus:duplicate'),
            this.cacheService.deleteOne(`game-proposal:bySubmitter:${proposal.submittedBy}`),
            this.cacheService.deleteOne(`user-proposal-stats:${proposal.submittedBy}`),
        ])

        return { success: true }
    }

    @LogFeature(new Logger('AdminService'))
    async deleteGameProposal(proposalId: number): Promise<{ success: boolean }> {
        return this.gameProposalService.deleteGameProposalById(proposalId)
    }

    // #endregion
}
