import { Injectable, Logger } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator'
import { GamesService } from '../../core/games/games.service'
import { MeetAccountGamesService } from '../../core/meet-account-games/meet-account-games.service'
import { MeetAttendeesService } from '../../core/meet-attendees/meet-attendees.service'
import { UsersService } from '../../core/users/users.service'
import { MeetsService } from '../../meets/meets.service'

import type { HistoryRecordDto } from './play.types'
import type { MeetDto } from '../../../common/types/meet.type'

@Injectable()
export class PlayService {
    constructor(
        private readonly usersService: UsersService,
        private readonly gamesService: GamesService,
        private readonly meetsService: MeetsService,
        private readonly meetAttendeesService: MeetAttendeesService,
        private readonly meetAccountGamesService: MeetAccountGamesService,
    ) {}

    @LogFeature(new Logger('PlayService'))
    async getUserGamesHistory(userId: number): Promise<Array<HistoryRecordDto>> {
        const meetAccountGames = await this.meetAccountGamesService.getMeetAccountGamesBy({ accountId: userId })

        return Promise.all(
            meetAccountGames.map(async record => {
                const meetAttendees = await this.meetAttendeesService.getMeetAttendeesByMeetId(record.meetId)

                return {
                    accountId: record.accountId,
                    gameId: record.gameId,
                    meetId: record.meetId,
                    gameData: await this.gamesService.getGameById(record.gameId),
                    meetData: await this.meetsService.getMeetById(record.meetId),
                    playedBy: await Promise.all(meetAttendees.map(async attendee => this.usersService.getUserById(attendee.accountId))),
                }
            }),
        )
    }

    @LogFeature(new Logger('PlayService'))
    async getUserMeets(userId: number): Promise<Array<MeetDto>> {
        // TODO: Implement this
        return []
        // Step 1: Get all groups for user
        // const getUserGroups = await this.databaseService.getUserGroups(userId)
        // const groupIds = getUserGroups.rows.map(row => Number(row[0]))

        // Step 2: Get meets for each group
        // const resultMeets: Array<MeetDto> = []

        // for (const groupId of []) {
        //     const resultSet = await this.databaseService.getGroupMeets(groupId)

        //     const meets = resultSet.rows.map(row => ({
        //         id: Number(row[0]),
        //         groupId: Number(row[1]),
        //         createdBy: Number(row[2]),
        //         meetDate: String(row[3]),
        //         isConfirmed: Boolean(row[4]),
        //     }))

        //     resultMeets.push(...meets)
        // }
        // return resultMeets.sort((a, b) => {
        //     return new Date(b.meetDate).getTime() - new Date(a.meetDate).getTime()
        // })
    }
}
