import { Injectable, Logger } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator'
import { GameTranslationService } from '../../core/game-translation/game-translation.service'
import { GamesService } from '../../core/games/games.service'
import { MeetAccountGamesService } from '../../core/meet-account-games/meet-account-games.service'
import { MeetsService } from '../../core/meets/meets.service'
import { UsersService } from '../../core/users/users.service'

import type { HistoryRecordDto } from './play.types'
import type { MeetDto } from '../../../common/types/meet.type'

@Injectable()
export class PlayService {
    constructor(
        private readonly usersService: UsersService,
        private readonly gamesService: GamesService,
        private readonly meetsService: MeetsService,
        private readonly meetAccountGamesService: MeetAccountGamesService,
        private readonly gameTranslationService: GameTranslationService,
    ) {}

    @LogFeature(new Logger('PlayService'))
    async getUserGamesHistory(userId: number): Promise<Array<HistoryRecordDto>> {
        const meetsYouParticipatedIn = await this.meetAccountGamesService.getDistinctMeetIdsByAccountId(userId)

        return Promise.all(
            meetsYouParticipatedIn.map(async meetId => {
                const meetData = await this.meetsService.getMeetById(meetId)
                const gameIds = await this.meetAccountGamesService.getDistinctGameIdsByMeetId(meetId)
                const gamesPlayed = await Promise.all(
                    gameIds.map(async gameId => {
                        const game = await this.gamesService.getGameById(gameId)
                        const gameTranslations = await this.gameTranslationService.getGameTranslations(gameId)
                        const playedByIds = await this.meetAccountGamesService.getDistinctAccountIdsByMeetIdAndGameId(meetId, gameId)
                        const playedByData = await Promise.all(playedByIds.map(async accountId => this.usersService.getUserById(accountId)))

                        return {
                            gameData: {
                                ...game,
                                titleTranslations: gameTranslations,
                            },
                            playedBy: playedByData,
                        }
                    }),
                )

                return {
                    meetData,
                    gamesPlayed,
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
