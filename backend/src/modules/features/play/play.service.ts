import { Injectable, Logger } from '@nestjs/common'
import { LogFeature } from '../../../common/decorators/logger.decorator'
import { UsersService } from '../../users/users.service'
import { GamesService } from '../../core/games/games.service'
import { MeetsService } from '../../meets/meets.service'
import { MeetAttendeesService } from '../../core/meet-attendees/meet-attendees.service'
import { MeetAccountGamesService } from '../../core/meet-account-games/meet-account-games.service'
import type { HistoryRecordDto } from '../../../common/types/meet-account-game.type'

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
        const meetAccountGames = await this.meetAccountGamesService.getMeetAccountGamesByAccountId(userId)
        return Promise.all(meetAccountGames.map(async record => {
            const meetAttendees = await this.meetAttendeesService.getMeetAttendeesByMeetId(record.meetId)
            console.log(record)
            return {
                accountId: record.accountId,
                gameId: record.gameId,
                meetId: record.meetId,
                gameData: await this.gamesService.getGameById(record.gameId),
                meetData: await this.meetsService.getMeetById(record.meetId),
                playedBy: await Promise.all(meetAttendees.map(async attendee => this.usersService.getUserById(attendee.accountId))),
            }
        }))
    }
}
