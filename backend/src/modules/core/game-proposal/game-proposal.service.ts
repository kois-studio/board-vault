import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { gameProposalSchema, gameProposalsSchema } from '../../../common/schemas/db-game-proposal.schema'
import type { GameProposalDto, CreateGameProposalBody, UpdateGameProposalBody } from '../../../common/types/game-proposal.type'
import { CacheService } from '../../common/cache/cache.service'
import { DatabaseService } from '../../common/database/database.service'

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
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    private _validateSingleSchema(proposal: GameProposalDto): GameProposalDto {
        const result = gameProposalSchema.safeParse(proposal)

        if (!result.success) {
            this.LOGGER.error('Failed to parse GameProposal from database')
            this.LOGGER.error(result.error)
            throw new Error('Invalid game proposal data')
        }

        return result.data
    }

    async getGameProposals(): Promise<Array<GameProposalDto>> {
        this.LOGGER.log('Getting all game proposals')

        const resultSet = await this.databaseService.getGameProposals()
        const proposals = this._parseResultSet(resultSet)

        return proposals
    }

    async getGameProposalById(id: number): Promise<GameProposalDto> {
        this.LOGGER.log(`Getting game proposal by id ${id}`)

        const resultSet = await this.databaseService.getGameProposalById(id)
        const proposals = this._parseResultSet(resultSet)

        if (proposals.length === 0) {
            throw new NotFoundException(`Game proposal with id ${id} not found`)
        }

        return proposals[0]
    }

    async getGameProposalsByStatus(status: 'pending' | 'approved' | 'rejected' | 'duplicate'): Promise<Array<GameProposalDto>> {
        this.LOGGER.log(`Getting game proposals by status: ${status}`)

        const resultSet = await this.databaseService.getGameProposalsByStatus(status)
        const proposals = this._parseResultSet(resultSet)

        return proposals
    }

    async getGameProposalsBySubmitter(submittedBy: number): Promise<Array<GameProposalDto>> {
        this.LOGGER.log(`Getting game proposals by submitter ${submittedBy}`)

        const resultSet = await this.databaseService.getGameProposalsBySubmitter(submittedBy)
        const proposals = this._parseResultSet(resultSet)

        return proposals
    }

    async createGameProposal(submittedBy: number, proposalData: CreateGameProposalBody): Promise<GameProposalDto> {
        this.LOGGER.log(`Creating game proposal: ${proposalData.title} by user ${submittedBy}`)

        await this.databaseService.createGameProposal({
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
        const resultSet = await this.databaseService.getGameProposalsBySubmitter(submittedBy)
        const proposals = this._parseResultSet(resultSet)
        
        // Return the most recent one (should be the one we just created)
        const createdProposal = proposals[0]
        
        // Clear cache
        await this.cacheService.deleteOne(`${this.CACHE_KEY}:bySubmitter:${submittedBy}`)
        await this.cacheService.deleteOne(`${this.CACHE_KEY}:byStatus:pending`)

        return createdProposal
    }

    async updateGameProposal(id: number, updateData: UpdateGameProposalBody, reviewedBy?: number): Promise<GameProposalDto> {
        this.LOGGER.log(`Updating game proposal ${id}`)

        const updatePayload: any = { ...updateData }
        if (reviewedBy !== undefined) {
            updatePayload.reviewedBy = reviewedBy
        }

        await this.databaseService.updateGameProposal(id, updatePayload)

        // Clear cache
        await this.cacheService.deleteOne(`${this.CACHE_KEY}:byId:${id}`)
        if (updateData.status) {
            await this.cacheService.deleteOne(`${this.CACHE_KEY}:byStatus:${updateData.status}`)
        }

        return this.getGameProposalById(id)
    }

    async deleteGameProposalById(id: number): Promise<{ success: boolean }> {
        this.LOGGER.log(`Deleting game proposal ${id}`)

        await this.databaseService.deleteGameProposalById(id)

        // Clear cache
        await this.cacheService.deleteOne(`${this.CACHE_KEY}:byId:${id}`)

        return { success: true }
    }

    async approveGameProposal(id: number, reviewedBy: number, reviewNotes?: string, createdGameId?: number): Promise<GameProposalDto> {
        this.LOGGER.log(`Approving game proposal ${id}`)

        return this.updateGameProposal(id, {
            status: 'approved',
            reviewNotes,
            createdGameId,
        }, reviewedBy)
    }

    async rejectGameProposal(id: number, reviewedBy: number, reviewNotes: string): Promise<GameProposalDto> {
        this.LOGGER.log(`Rejecting game proposal ${id}`)

        return this.updateGameProposal(id, {
            status: 'rejected',
            reviewNotes,
        }, reviewedBy)
    }

    async markGameProposalAsDuplicate(id: number, reviewedBy: number, reviewNotes?: string): Promise<GameProposalDto> {
        this.LOGGER.log(`Marking game proposal ${id} as duplicate`)

        return this.updateGameProposal(id, {
            status: 'duplicate',
            reviewNotes,
        }, reviewedBy)
    }
} 
