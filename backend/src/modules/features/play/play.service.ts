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
                const meetData = await this.meetsService.getMeetById(meetId, userId)
                const gameIds = await this.meetAccountGamesService.getDistinctGameIdsByMeetId(meetId)
                const gamesPlayed = await Promise.all(
                    gameIds.map(async gameId => {
                        const game = await this.gamesService.getGameById(gameId)
                        const gameTranslations = await this.gameTranslationService.getGameTranslations(gameId)
                        const playedByIds = await this.meetAccountGamesService.getDistinctAccountIdsByMeetIdAndGameId(meetId, gameId)
                        const playedByData = await Promise.all(
                            playedByIds.map(async accountId => this.usersService.getPublicUserById(accountId)),
                        )

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
        const meets = await this.meetsService.getMeetsForAccount(userId)

        return meets.sort((a, b) => new Date(b.meetDate).getTime() - new Date(a.meetDate).getTime())
    }
}
