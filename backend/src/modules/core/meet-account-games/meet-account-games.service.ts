import { ResultSet } from '@libsql/client'
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { meetAccountGamesSchema } from '../../../common/schemas/db-meet-account-game.schema.js'
import { DatabaseService } from '../../common/database/database.service.js'

import type { MeetAccountGameQueryOptions } from './meet-account-games.types.js'
import type { MeetAccountGameDto } from '../../../common/types/meet-account-game.type.js'

@Injectable()
export class MeetAccountGamesService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<MeetAccountGameDto> {
        const meetAccountGames = resultSet.rows.map(row => ({
            meetId: Number(row[0]),
            accountId: Number(row[1]),
            gameId: Number(row[2]),
        }))

        return this._validateSchema(meetAccountGames)
    }

    private _validateSchema(meetAccountGames: Array<MeetAccountGameDto>): Array<MeetAccountGameDto> {
        const result = meetAccountGamesSchema.safeParse(meetAccountGames)

        if (!result.success) {
            this.LOGGER.error('Failed to parse MeetAccountGames from database')
            return []
        }

        return result.data
    }

    // #region special query

    private async _queryMeetAccountGame(options: MeetAccountGameQueryOptions): Promise<{
        singleField: number[]
        fullRecords: MeetAccountGameDto[]
    }> {
        this.LOGGER.log('Querying legacy MeetAccountGame compatibility data')
        const resultSet = await this.databaseService.sessions.queryMeetAccountGame(options)

        // For single field selections with distinct, return an array of that field
        if (options.select && options.select.length === 1) {
            return {
                singleField: resultSet.rows.map(row => Number(row[0])),
                fullRecords: [],
            }
        }

        // For full record selections, parse and validate
        return {
            singleField: [],
            fullRecords: this._parseResultSet(resultSet),
        }
    }

    // #region query wrappers

    async getMeetAccountGamesBy(config: { accountId?: number; meetId?: number; gameId?: number }): Promise<Array<MeetAccountGameDto>> {
        this.LOGGER.log('Getting legacy MeetAccountGame records')
        const resultSet = await this._queryMeetAccountGame({
            where: config,
        })

        return resultSet.fullRecords
    }

    async getDistinctAccountIdsByMeetId(meetId: number): Promise<number[]> {
        this.LOGGER.log('Getting distinct account IDs for a legacy meeting')
        const result = await this._queryMeetAccountGame({
            select: ['accountId'],
            where: { meetId },
            distinct: true,
        })

        return result.singleField
    }

    async getDistinctMeetIdsByAccountId(accountId: number): Promise<number[]> {
        this.LOGGER.log('Getting distinct legacy meeting IDs for an account')
        const result = await this._queryMeetAccountGame({
            select: ['meetId'],
            where: { accountId },
            distinct: true,
        })

        return result.singleField
    }

    async getDistinctGameIdsByMeetId(meetId: number): Promise<number[]> {
        this.LOGGER.log('Getting distinct game IDs for a legacy meeting')
        const result = await this._queryMeetAccountGame({
            select: ['gameId'],
            where: { meetId },
            distinct: true,
        })

        return result.singleField
    }

    async getDistinctAccountIdsByMeetIdAndGameId(meetId: number, gameId: number): Promise<number[]> {
        this.LOGGER.log('Getting distinct account IDs for a legacy meeting game')
        const result = await this._queryMeetAccountGame({
            select: ['accountId'],
            where: { meetId, gameId },
            distinct: true,
        })

        return result.singleField
    }

    // #region other

    private async _assertAccountCanAccessMeet(accountId: number, meetId: number): Promise<number> {
        const resultSet = await this.databaseService.sessions.getMeetByIdForAccount(meetId, accountId)

        const [meet] = resultSet.rows

        if (!meet) {
            throw new ForbiddenException('You are not a member of this meet group')
        }

        return Number(meet[1])
    }

    async createMeetAccountGameForAccount(accountId: number, meetId: number, gameId: number): Promise<MeetAccountGameDto> {
        const groupId = await this._assertAccountCanAccessMeet(accountId, meetId)
        const availableGameIds = new Set(await this.databaseService.groups.getGroupAvailableGameIds(groupId))

        if (!availableGameIds.has(gameId)) {
            throw new BadRequestException('The game must be owned by at least one member of the meet group')
        }

        return this.createMeetAccountGame(accountId, meetId, gameId)
    }

    async deleteMeetAccountGameForAccount(accountId: number, meetId: number, gameId: number): Promise<{ success: boolean }> {
        await this._assertAccountCanAccessMeet(accountId, meetId)

        return this.deleteMeetAccountGame(accountId, meetId, gameId)
    }

    async createMeetAccountGame(accountId: number, meetId: number, gameId: number): Promise<MeetAccountGameDto> {
        this.LOGGER.log('Creating a legacy MeetAccountGame record')
        const resultSet = await this.databaseService.sessions.createMeetAccountGame(accountId, meetId, gameId)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`Meet with meetId ${meetId} not found`)
        }

        return { accountId, meetId, gameId }
    }

    async deleteMeetAccountGame(accountId: number, meetId: number, gameId: number): Promise<{ success: boolean }> {
        this.LOGGER.log('Deleting a legacy MeetAccountGame record')
        const resultSet = await this.databaseService.sessions.deleteMeetAccountGame(accountId, meetId, gameId)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`Meet with meetId ${meetId} not found`)
        }

        return { success: true }
    }
}
