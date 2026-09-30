import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { gameProposalSchema, gameProposalsSchema } from '../../../common/schemas/db-game-proposal.schema'
import { CacheService } from '../../common/cache/cache.service'
import { DatabaseService } from '../../common/database/database.service'

import type { GameProposalDto, CreateGameProposalBody, UpdateGameProposalBody } from '../../../common/types/game-proposal.type'
import type { UserProposalStatsDto } from '../../../common/types/stats.type'

@Injectable()
export class GameProposalService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)
    private readonly CACHE_KEY = 'game-proposal'

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
    ) {}

    private _parseResultSet(resultSet: ResultSet): Array<GameProposalDto> {
        const proposals = resultSet.rows.map(row => ({
            id: Number(row[0]),
            submittedBy: Number(row[1]),
            status: String(row[2]) as 'pending' | 'approved' | 'rejected' | 'duplicate',
            title: String(row[3]),
            imageUrl: row[4] ? String(row[4]) : null,
            gameAvgDuration: row[5] ? Number(row[5]) : null,
            minPlayers: row[6] ? Number(row[6]) : null,
            maxPlayers: row[7] ? Number(row[7]) : null,
            proposedTags: row[8] ? String(row[8]) : null,
            notes: row[9] ? String(row[9]) : null,
            reviewedBy: row[10] ? Number(row[10]) : null,
            reviewedAt: row[11] ? String(row[11]) : null,
            reviewNotes: row[12] ? String(row[12]) : null,
            createdGameId: row[13] ? Number(row[13]) : null,
            submittedAt: String(row[14]),
        }))

        return this._validateSchema(proposals)
    }

    private _validateSchema(proposals: Array<GameProposalDto>): Array<GameProposalDto> {
        const result = gameProposalsSchema.safeParse(proposals)

        if (!result.success) {
            this.LOGGER.error('Failed to parse GameProposals from database')
            return []
        }

        return result.data
    }

    private _validateSingleSchema(proposal: GameProposalDto): GameProposalDto {
        const result = gameProposalSchema.safeParse(proposal)

        if (!result.success) {
            this.LOGGER.error('Failed to parse GameProposal from database')
            throw new Error('Invalid game proposal data')
        }

        return result.data
    }

    async getGameProposals(): Promise<Array<GameProposalDto>> {
        this.LOGGER.log('Getting all game proposals')

        const resultSet = await this.databaseService.games.getGameProposals()
        const proposals = this._parseResultSet(resultSet)

        return proposals
    }

    async getGameProposalById(id: number): Promise<GameProposalDto> {
        this.LOGGER.log('Getting game proposal by id')

        const resultSet = await this.databaseService.games.getGameProposalById(id)
        const proposals = this._parseResultSet(resultSet)

        if (proposals.length === 0) {
            throw new NotFoundException(`Game proposal with id ${id} not found`)
        }

        return proposals[0]
    }

    async getGameProposalsByStatus(status: 'pending' | 'approved' | 'rejected' | 'duplicate'): Promise<Array<GameProposalDto>> {
        this.LOGGER.log('Getting game proposals by status')

        const resultSet = await this.databaseService.games.getGameProposalsByStatus(status)
        const proposals = this._parseResultSet(resultSet)

        return proposals
    }

    async getGameProposalsBySubmitter(submittedBy: number): Promise<Array<GameProposalDto>> {
        this.LOGGER.log('Getting game proposals by submitter')

        const resultSet = await this.databaseService.games.getGameProposalsBySubmitter(submittedBy)
        const proposals = this._parseResultSet(resultSet)

        return proposals
    }

    async createGameProposal(submittedBy: number, proposalData: CreateGameProposalBody): Promise<GameProposalDto> {
        this.LOGGER.log('Creating game proposal')

        await this.databaseService.games.createGameProposal({
            submittedBy,
            title: proposalData.title,
            imageUrl: proposalData.imageUrl,
            gameAvgDuration: proposalData.gameAvgDuration,
            minPlayers: proposalData.minPlayers,
            maxPlayers: proposalData.maxPlayers,
            proposedTags: proposalData.proposedTags,
            notes: proposalData.notes,
        })

        // Get the created proposal to return it
        const resultSet = await this.databaseService.games.getGameProposalsBySubmitter(submittedBy)
        const proposals = this._parseResultSet(resultSet)

        // Return the most recent one (should be the one we just created)
        const createdProposal = proposals[0]

        // Clear cache
        await this.cacheService.deleteOne(`${this.CACHE_KEY}:bySubmitter:${submittedBy}`)
        await this.cacheService.deleteOne(`${this.CACHE_KEY}:byStatus:pending`)

        // TODO: Future enhancements - Add side effects here:
        // - Send email notification to admin about new proposal
        // - Send notification to user confirming proposal submission
        // - Log analytics event for proposal creation
        // - Trigger webhook for external integrations
        // - Update proposal statistics cache

        return createdProposal
    }

    async updateGameProposal(id: number, updateData: UpdateGameProposalBody, reviewedBy?: number): Promise<GameProposalDto> {
        this.LOGGER.log('Updating game proposal')

        const updatePayload: any = { ...updateData }

        if (reviewedBy !== undefined) {
            updatePayload.reviewedBy = reviewedBy
        }

        await this.databaseService.games.updateGameProposal(id, updatePayload)

        // Clear cache
        await this.cacheService.deleteOne(`${this.CACHE_KEY}:byId:${id}`)
        if (updateData.status) {
            await this.cacheService.deleteOne(`${this.CACHE_KEY}:byStatus:${updateData.status}`)
        }

        return this.getGameProposalById(id)
    }

    async deleteGameProposalById(id: number): Promise<{ success: boolean }> {
        this.LOGGER.log('Deleting game proposal')

        await this.databaseService.games.deleteGameProposalById(id)

        // Clear cache
        await this.cacheService.deleteOne(`${this.CACHE_KEY}:byId:${id}`)

        return { success: true }
    }

    async approveGameProposal(id: number, reviewedBy: number, reviewNotes?: string, createdGameId?: number): Promise<GameProposalDto> {
        this.LOGGER.log('Approving game proposal')

        const proposal = await this.updateGameProposal(
            id,
            {
                status: 'approved',
                reviewNotes,
                createdGameId,
            },
            reviewedBy,
        )

        // Clear user proposal stats cache
        await this.cacheService.deleteOne(`user-proposal-stats:${proposal.submittedBy}`)

        return proposal
    }

    async rejectGameProposal(id: number, reviewedBy: number, reviewNotes: string): Promise<GameProposalDto> {
        this.LOGGER.log('Rejecting game proposal')

        const proposal = await this.updateGameProposal(
            id,
            {
                status: 'rejected',
                reviewNotes,
            },
            reviewedBy,
        )

        // Clear user proposal stats cache
        await this.cacheService.deleteOne(`user-proposal-stats:${proposal.submittedBy}`)

        return proposal
    }

    async markGameProposalAsDuplicate(id: number, reviewedBy: number, reviewNotes?: string): Promise<GameProposalDto> {
        this.LOGGER.log('Marking game proposal as duplicate')

        const proposal = await this.updateGameProposal(
            id,
            {
                status: 'duplicate',
                reviewNotes,
            },
            reviewedBy,
        )

        // Clear user proposal stats cache
        await this.cacheService.deleteOne(`user-proposal-stats:${proposal.submittedBy}`)

        return proposal
    }

    async getUserProposalStats(userId: number): Promise<UserProposalStatsDto> {
        this.LOGGER.log('Getting user proposal stats')

        // Try to get from cache first
        const cachedStats = await this.cacheService.get(`user-proposal-stats:${userId}`)

        if (cachedStats) {
            return cachedStats as UserProposalStatsDto
        }

        // Get all proposals for the user
        const proposals = await this.getGameProposalsBySubmitter(userId)

        // Calculate stats
        const totalProposals = proposals.length
        const approvedProposals = proposals.filter(p => p.status === 'approved').length
        const rejectedProposals = proposals.filter(p => p.status === 'rejected').length
        const duplicateProposals = proposals.filter(p => p.status === 'duplicate').length
        const pendingProposals = proposals.filter(p => p.status === 'pending').length

        const approvalRate = totalProposals > 0 ? (approvedProposals / totalProposals) * 100 : 0

        // Calculate reputation score (0-100)
        // Formula: (approved * 10) + (rejected * -5) + (duplicate * -2) + (pending * 0)
        const reputationScore = Math.max(0, Math.min(100, approvedProposals * 10 + rejectedProposals * -5 + duplicateProposals * -2))

        const stats: UserProposalStatsDto = {
            totalProposals,
            approvedProposals,
            rejectedProposals,
            duplicateProposals,
            pendingProposals,
            approvalRate: Math.round(approvalRate * 100) / 100, // Round to 2 decimal places
            reputationScore: Math.round(reputationScore),
        }

        // Cache the stats for 5 minutes
        await this.cacheService.set(`user-proposal-stats:${userId}`, stats, 'short')

        return stats
    }
}
