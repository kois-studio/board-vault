import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator'
import { DatabaseService } from '../../common/database/database.service'
import { GameTranslationService } from '../../core/game-translation/game-translation.service'
import { GamesService } from '../../core/games/games.service'
import { MeetAccountGamesService } from '../../core/meet-account-games/meet-account-games.service'
import { MeetsService } from '../../core/meets/meets.service'
import { UsersService } from '../../core/users/users.service'

import type {
    HistoryRecordDto,
    RecommendationDto,
    RecommendationFeedbackBody,
    RecommendationFeedbackDto,
    RecommendationRequestBody,
    RecommendationsDto,
} from './play.types'
import type { MeetDto } from '../../../common/types/meet.type'

@Injectable()
export class PlayService {
    constructor(
        private readonly usersService: UsersService,
        private readonly databaseService: DatabaseService,
        private readonly gamesService: GamesService,
        private readonly meetsService: MeetsService,
        private readonly meetAccountGamesService: MeetAccountGamesService,
        private readonly gameTranslationService: GameTranslationService,
    ) {}

    @LogFeature(new Logger('PlayService'))
    async getRecommendations(actorAccountId: number, body: RecommendationRequestBody): Promise<RecommendationsDto> {
        const group = await this.databaseService.getGroupById(body.groupId)
        if (group.rows.length === 0) {
            throw new NotFoundException(`Group with id ${body.groupId} not found`)
        }

        const memberIds = await this.databaseService.getGroupMemberIds(body.groupId)
        if (!memberIds.includes(actorAccountId)) {
            throw new ForbiddenException('You must belong to the group to get recommendations')
        }

        if (body.attendeeIds.some(accountId => !memberIds.includes(accountId))) {
            throw new BadRequestException('Every attendee must belong to the selected group')
        }

        const resultSet = await this.databaseService.getRecommendationCandidates(body.attendeeIds, body.attendeeIds.length, body.availableMinutes)
        const recommendations = resultSet.rows
            .map(row => this._mapRecommendation(row, body.attendeeIds.length, body.availableMinutes))
            .sort((a, b) => b.score - a.score || a.gameData.id - b.gameData.id)
            .slice(0, 10)

        let noResultReason: string | null = null
        if (recommendations.length === 0) {
            noResultReason = await this._getNoResultReason(body)
        }

        return {
            groupId: body.groupId,
            attendeeIds: body.attendeeIds,
            availableMinutes: body.availableMinutes ?? null,
            recommendations,
            noResultReason,
        }
    }

    private async _getNoResultReason(body: RecommendationRequestBody): Promise<string> {
        const counts = await this.databaseService.getRecommendationCandidateCounts(body.attendeeIds, body.attendeeIds.length, body.availableMinutes)
        const row = counts.rows[0]
        const ownedGameCount = Number(row?.[0] ?? 0)
        const playerFitCount = Number(row?.[1] ?? 0)
        const durationFitCount = Number(row?.[2] ?? 0)

        if (ownedGameCount === 0) {
            return 'No games are owned by the selected attendees.'
        }
        if (playerFitCount === 0) {
            return `No games owned by the selected attendees support ${body.attendeeIds.length} players.`
        }
        if (body.availableMinutes !== undefined && durationFitCount === 0) {
            return `No games for ${body.attendeeIds.length} players fit within ${body.availableMinutes} minutes.`
        }

        return 'No suitable titled games were found for the selected attendees and filters.'
    }

    private _mapRecommendation(row: { [key: number]: unknown }, attendeeCount: number, availableMinutes?: number): RecommendationDto {
        const gameId = Number(row[0])
        const gameAvgDuration = row[2] === null || row[2] === undefined ? 0 : Number(row[2])
        const minPlayers = row[3] === null || row[3] === undefined ? 0 : Number(row[3])
        const maxPlayers = row[4] === null || row[4] === undefined ? 0 : Number(row[4])
        const titleEn = String(row[5] ?? row[6])
        const titleEs = String(row[6] ?? row[5])
        const attendeeOwnerCount = Number(row[7])
        const averageReview = row[8] === null || row[8] === undefined ? null : Number(row[8])
        const lastPlayedAt = row[9] === null || row[9] === undefined ? null : String(row[9])
        const durationScore = availableMinutes !== undefined && gameAvgDuration > 0
            ? Math.round(20 * Math.max(0, 1 - Math.abs(availableMinutes - gameAvgDuration) / availableMinutes))
            : 0
        const ownershipScore = Math.round(20 * (attendeeOwnerCount / attendeeCount))
        const ratingScore = averageReview === null ? 0 : Math.round(20 * (averageReview / 10))
        const reasons = [`Owned by ${attendeeOwnerCount} of ${attendeeCount} selected attendees`, `Fits ${attendeeCount} players`]

        if (availableMinutes !== undefined) {
            reasons.push(gameAvgDuration > 0 ? `Estimated duration: ${gameAvgDuration} minutes` : 'Duration is not available')
        }
        reasons.push(averageReview === null ? 'No selected-attendee rating yet' : `Selected-attendee rating: ${averageReview.toFixed(1)}/10`)

        return {
            gameData: {
                id: gameId,
                imageUrl: String(row[1]),
                gameAvgDuration,
                minPlayers,
                maxPlayers,
                titleTranslations: { en: titleEn, es: titleEs },
            },
            score: 40 + ownershipScore + ratingScore + durationScore,
            explanation: {
                reasons,
                attendeeOwnerCount,
                attendeeCount,
                averageReview,
                lastPlayedAt,
            },
        }
    }

    @LogFeature(new Logger('PlayService'))
    async createRecommendationFeedback(actorAccountId: number, body: RecommendationFeedbackBody): Promise<RecommendationFeedbackDto> {
        const group = await this.databaseService.getGroupById(body.groupId)
        if (group.rows.length === 0) {
            throw new NotFoundException(`Group with id ${body.groupId} not found`)
        }

        const memberIds = await this.databaseService.getGroupMemberIds(body.groupId)
        if (!memberIds.includes(actorAccountId)) {
            throw new ForbiddenException('You must belong to the group to submit recommendation feedback')
        }

        if (body.attendeeIds.some(accountId => !memberIds.includes(accountId))) {
            throw new BadRequestException('Every attendee must belong to the selected group')
        }

        const ownedGame = await this.databaseService.getOwnedGameByAnyAccount(body.gameId, body.attendeeIds)
        if (ownedGame.rows.length === 0) {
            throw new BadRequestException('The selected attendees do not own this game')
        }

        await this.databaseService.createRecommendationFeedback({
            accountId: actorAccountId,
            groupId: body.groupId,
            gameId: body.gameId,
            attendeeIds: JSON.stringify(body.attendeeIds),
            feedback: body.feedback,
        })

        return { success: true }
    }

    @LogFeature(new Logger('PlayService'))
    async getUserGamesHistory(userId: number): Promise<Array<HistoryRecordDto>> {
        const meetsYouParticipatedIn = await this.meetAccountGamesService.getDistinctMeetIdsByAccountId(userId)

        const history = await Promise.all(
            meetsYouParticipatedIn.map(async meetId => {
                const meetData = await this.meetsService.getMeetById(meetId, userId)
                if (meetData.status !== 'completed') {
                    return null
                }

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

        return history.filter((record): record is HistoryRecordDto => record !== null)
    }

    @LogFeature(new Logger('PlayService'))
    async getUserMeets(userId: number): Promise<Array<MeetDto>> {
        const meets = await this.meetsService.getMeetsForAccount(userId)

        return meets.sort((a, b) => new Date(b.meetDate).getTime() - new Date(a.meetDate).getTime())
    }
}
