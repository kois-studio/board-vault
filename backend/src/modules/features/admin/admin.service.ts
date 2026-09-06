import { Injectable, Logger } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator'
import {
    UpdateGameTranslationsBody,
    UpdateGameTagsBody,
    AdminGamesResponseDto,
    ApproveGameProposalBody,
    RejectGameProposalBody,
    AdminGameProposalsResponseDto,
} from '../../../common/types/admin.type'
import { GameProposalCompleteDto } from '../../../common/types/game-proposal.type'
import { SupportedLanguage } from '../../../common/types/game-translation.type'
import { TagDto, GameTagWithCategoryDto } from '../../../common/types/tag.type'
import { GameProposalService } from '../../../modules/core/game-proposal/game-proposal.service'
import { GameTagsService } from '../../../modules/core/game-tags/game-tags.service'
import { GameTranslationService } from '../../../modules/core/game-translation/game-translation.service'
import { GamesService } from '../../../modules/core/games/games.service'
import { NotificationTypeEnum } from '../../../modules/core/notifications/notifications-enum.type'
import { NotificationsService } from '../../../modules/core/notifications/notifications.service'
import { TagCategoryService } from '../../../modules/core/tag-category/tag-category.service'
import { TagsService } from '../../../modules/core/tags/tags.service'
import { CacheService } from '../../common/cache/cache.service'
import { DatabaseService } from '../../common/database/database.service'

import type { TagCategoryWithTagsDto } from '../../../common/types/tag-category.type'

@Injectable()
export class AdminService {
    constructor(
        private readonly tagService: TagsService,
        private readonly gameService: GamesService,
        private readonly gameTagsService: GameTagsService,
        private readonly tagCategoryService: TagCategoryService,
        private readonly gameTranslationService: GameTranslationService,
        private readonly gameProposalService: GameProposalService,
        private readonly notificationsService: NotificationsService,
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
    ) {}

    // #region Tag Categories

    @LogFeature(new Logger('AdminService'))
    async getAdminTagCategories(): Promise<TagCategoryWithTagsDto[]> {
        const categories = await this.tagCategoryService.getTagCategories()

        return Promise.all(
            categories.map(async category => {
                const tags = await this.tagService.getTagsByCategoryId(category.id)
                const gameCount = await this.gameTagsService.getGameCountByTagCategoryId(category.id)

                return {
                    ...category,
                    tags,
                    gameCount,
                }
            }),
        )
    }

    // #endregion

    async createTagCategory(name: string): Promise<TagCategoryWithTagsDto> {
        const category = await this.tagCategoryService.createTagCategory(name)
        const tags = await this.tagService.getTagsByCategoryId(category.id)
        const gameCount = await this.gameTagsService.getGameCountByTagCategoryId(category.id)

        return {
            ...category,
            tags,
            gameCount,
        }
    }

    async updateTagCategory(id: number, name: string): Promise<TagCategoryWithTagsDto> {
        const category = await this.tagCategoryService.updateTagCategory(id, name)
        const tags = await this.tagService.getTagsByCategoryId(category.id)
        const gameCount = await this.gameTagsService.getGameCountByTagCategoryId(category.id)

        return {
            ...category,
            tags,
            gameCount,
        }
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
        // Get proposals based on status filter
        const proposals = status
            ? await this.gameProposalService.getGameProposalsByStatus(status)
            : await this.gameProposalService.getGameProposals()

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

        // Create the new game
        const gameData = {
            title: proposal.title,
            imageUrl: approvalData.imageUrl ?? proposal.imageUrl ?? 'https://via.placeholder.com/300x200?text=No+Image',
            gameAvgDuration: approvalData.gameAvgDuration ?? proposal.gameAvgDuration ?? 60,
            minPlayers: approvalData.minPlayers ?? proposal.minPlayers ?? 2,
            maxPlayers: approvalData.maxPlayers ?? proposal.maxPlayers ?? 4,
        }

        const translations: Array<{ languageCode: SupportedLanguage; title: string; normalizedTitle: string }> = []
        let englishTranslationAdded = false

        if (approvalData.translations && Object.keys(approvalData.translations).length > 0) {
            for (const [languageCode, title] of Object.entries(approvalData.translations)) {
                if (title?.trim()) {
                    translations.push({
                        languageCode: languageCode as SupportedLanguage,
                        title,
                        normalizedTitle: this.gameTranslationService.normalizeTitle(title),
                    })
                    englishTranslationAdded = englishTranslationAdded || languageCode === 'en'
                }
            }
        }

        if (!englishTranslationAdded) {
            translations.push({
                languageCode: 'en',
                title: proposal.title,
                normalizedTitle: this.gameTranslationService.normalizeTitle(proposal.title),
            })
        }

        const { createdGameId } = await this.databaseService.approveGameProposalAtomically({
            proposalId,
            reviewerId,
            ...gameData,
            translations,
            tagIds: approvalData.tagIds ?? [],
            reviewNotes: approvalData.reviewNotes,
            notification: {
                accountId: proposal.submittedBy,
                type: NotificationTypeEnum.GAME_PROPOSAL_APPROVED,
                message: `Your game proposal "${proposal.title}" was approved!`,
                data: {
                    gameTitle: proposal.title,
                    proposalId: proposal.id,
                    createdGameId: undefined,
                },
            },
        })

        await Promise.all([
            this.cacheService.deleteOne(`game-proposal:byId:${proposalId}`),
            this.cacheService.deleteOne('game-proposal:byStatus:pending'),
            this.cacheService.deleteOne('game-proposal:byStatus:approved'),
            this.cacheService.deleteOne(`game-proposal:bySubmitter:${proposal.submittedBy}`),
            this.cacheService.deleteOne(`user-proposal-stats:${proposal.submittedBy}`),
        ])

        return { success: true, createdGameId }
    }

    @LogFeature(new Logger('AdminService'))
    async rejectGameProposal(proposalId: number, reviewerId: number, rejectionData: RejectGameProposalBody): Promise<{ success: boolean }> {
        const proposal = await this.gameProposalService.getGameProposalById(proposalId)

        await this.databaseService.rejectGameProposalAtomically({
            proposalId,
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
    async markGameProposalAsDuplicate(proposalId: number, reviewerId: number, reviewNotes?: string): Promise<{ success: boolean }> {
        await this.gameProposalService.markGameProposalAsDuplicate(proposalId, reviewerId, reviewNotes)

        return { success: true }
    }

    @LogFeature(new Logger('AdminService'))
    async deleteGameProposal(proposalId: number): Promise<{ success: boolean }> {
        return this.gameProposalService.deleteGameProposalById(proposalId)
    }

    // #endregion
}
