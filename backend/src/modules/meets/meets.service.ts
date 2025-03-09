import { ResultSet } from '@libsql/client/.'
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../common/database/database.service'
import { MeetDto, MeetWithAttendeesAndGames } from '../../common/types/meet.type'
import { meetsSchema } from '../../common/schemas/db-meet.schema'
import { UserGetDto } from '../../common/types/user.type'
import { GameDto } from '../../common/types/game.type'
import { MeetAccountGamesService } from '../core/meet-account-games/meet-account-games.service'

@Injectable()
export class MeetsService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly meetAccountGamesService: MeetAccountGamesService,
    ) {}

    private _parseResultSet(resultSet: ResultSet): Array<MeetDto> {
        const meets = resultSet.rows.map(row => ({
            id: Number(row[0]),
            groupId: Number(row[1]),
            createdBy: Number(row[2]),
            meetDate: String(row[3]),
            isConfirmed: Boolean(row[4]),
        }))

        const result = meetsSchema.safeParse(meets)

        if (!result.success) {
            this.LOGGER.error('Failed to parse meets from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    async getMeets(): Promise<Array<MeetDto>> {
        this.LOGGER.log('Getting all meets')
        const resultSet = await this.databaseService.getMeets()

        return this._parseResultSet(resultSet)
    }

    async getMeetById(id: number): Promise<MeetDto> {
        this.LOGGER.log(`Getting meet with id ${id}`)
        const resultSet = await this.databaseService.getMeetById(id)
        const meets = this._parseResultSet(resultSet)

        if (meets.length === 0) {
            throw new NotFoundException(`Meet with id ${id} not found`)
        }

        return meets[0]
    }

    async getMeetDetailsById(id: number): Promise<MeetWithAttendeesAndGames> {
        this.LOGGER.log(`Getting meet details with id ${id}`)
        const resultSet = await this.databaseService.getMeetDetailsById(id)

        return resultSet.rows.map(row => ({
            id: Number(row[0]),
            groupId: Number(row[1]),
            createdBy: Number(row[2]),
            meetDate: String(row[3]),
            isConfirmed: Boolean(row[4]),
            attendees: JSON.parse(String(row[5])) as Array<UserGetDto['id']>,
            playedGames: JSON.parse(String(row[6])) as Array<GameDto['id']>,
        }))[0]
    }

    async confirmMeet(meetId: number): Promise<void> {
        this.LOGGER.log(`Confirming meet with id ${meetId}`)

        const meetDetails = await this.getMeetDetailsById(meetId)

        if (!meetDetails) {
            throw new NotFoundException(`Meet with id ${meetId} not found`)
        }

        // Check if the meet is already confirmed
        if (meetDetails.isConfirmed) {
            this.LOGGER.warn(`Meet with id ${meetId} is already confirmed`)
            throw new BadRequestException('Meet is already confirmed')
        }

        if (meetDetails.attendees.length === 0) {
            this.LOGGER.warn(`Meet with id ${meetId} has no attendees`)
            throw new BadRequestException('Meet has no attendees')
        }

        if (meetDetails.playedGames.length === 0) {
            this.LOGGER.warn(`Meet with id ${meetId} has no games`)
            throw new BadRequestException('Meet has no games')
        }

        // Mark the meet as confirmed in the database
        await this.databaseService.updateMeetConfirmation(meetId)

        // Create gameplay sessions for each game and attendee
        for (const accountId of meetDetails.attendees) {
            for (const gameId of meetDetails.playedGames) {
                await this.meetAccountGamesService.createMeetAccountGame(accountId, meetId, gameId)
            }
        }

        this.LOGGER.log(`Meet with id ${meetId} confirmed successfully`)
    }
}
