import { BadRequestException, Injectable, Logger } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator.js'
import {
    UpdateGameTranslationsBody,
    UpdateGameTagsBody,
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

@Injectable()
export class AdminService {
    constructor(
        private readonly tagService: TagsService,
        private readonly gameService: GamesService,
        private readonly gameTagsService: GameTagsService,
        private readonly tagCategoryService: TagCategoryService,
        private readonly gameTranslationService: GameTranslationService,
        private readonly gameProposalService: GameProposalService,
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
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

    // #endregion

    // #region Games

    @LogFeature(new Logger('AdminService'))
    async getAdminGames(search: string = '', page: number = 1, limit: number = 10): Promise<AdminGamesResponseDto> {
        // Use multi-language search for admin
        const result = await this.gameTranslationService.browseGamesByTitleMultiLanguage({
            search,
            page,
            pageSize: limit,
            excludeGameIds: [], // No exclusions for admin
        })

        // Get full game data with translations and tags for the found games
        const gamesWithDetails = await Promise.all(
            result.gameIds.map(async gameId => {
                const game = await this.gameService.getGameById(gameId)
                const translations = await this.gameTranslationService.getGameTranslations(gameId)
                const gameTags = await this.gameTagsService.getGameTags(gameId)

                // Get tag details for each game tag
                const tags: Array<GameTagWithCategoryDto> = await Promise.all(
                    gameTags.map(async gameTag => {
                        const tag = await this.tagService.getTagById(gameTag.tagId)
                        const category = await this.tagCategoryService.getTagCategoryById(tag.categoryId)

                        return {
                            id: tag.id,
                            name: tag.name,
                            categoryName: category.name,
                        }
                    }),
                )

                return {
                    ...game,
                    translations,
                    tags,
                }
            }),
        )

        return {
            games: gamesWithDetails,
            pagination: {
                currentPage: result.currentPage,
                totalPages: result.totalPages,
                totalItems: result.totalItems,
                itemsPerPage: result.itemsPerPage,
            },
        }
    }

    async updateGameTranslations(gameId: number, translations: UpdateGameTranslationsBody): Promise<{ success: boolean }> {
        // Update each translation
        for (const [languageCode, title] of Object.entries(translations)) {
            if (title?.trim()) {
                await this.gameTranslationService.upsertGameTranslation(gameId, languageCode, title)
            }
        }

        return { success: true }
    }

    async updateGameTags(gameId: number, payload: UpdateGameTagsBody): Promise<{ success: boolean }> {
        // Clear all existing tags for this game first
        const currentTags = await this.gameTagsService.getGameTags(gameId)

        for (const gameTag of currentTags) {
            await this.gameTagsService.removeGameTag(gameId, gameTag.tagId)
        }

        // Add the new tags
        for (const tagId of payload.tagIds) {
            await this.gameTagsService.addGameTag(gameId, tagId)
        }

        return { success: true }
    }

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

        const gameData = {
            title: proposal.title,
            // Empty means no artwork; the frontend shows its own placeholder.
            imageUrl: approvalData.imageUrl ?? proposal.imageUrl ?? '',
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
