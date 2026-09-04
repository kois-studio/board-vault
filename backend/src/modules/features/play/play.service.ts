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
    RecommendationSignalsDto,
    RecommendationsDto,
} from './play.types'
import type { MeetDto } from '../../../common/types/meet.type'
import type { AvatarDto, UserPublicDto } from '../../../common/types/user.type'

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

        const resultSet = await this.databaseService.getRecommendationCandidates(
            body.attendeeIds,
            body.attendeeIds.length,
            body.availableMinutes,
        )
        const feedbackByGame = new Map<number, { interestedCount: number; notForUsCount: number }>()

        if (resultSet.rows.length > 0) {
            const feedbackResult = await this.databaseService.getRecommendationFeedbackForGroup(body.groupId)
            const latestByMemberAndGame = new Set<string>()
            const attendeeIds = new Set(body.attendeeIds)

            for (const row of feedbackResult.rows) {
                const gameId = Number(row[1])
                const accountId = Number(row[2])

                if (!attendeeIds.has(accountId)) continue

                const key = `${gameId}:${accountId}`

                if (latestByMemberAndGame.has(key)) continue
                latestByMemberAndGame.add(key)

                const current = feedbackByGame.get(gameId) ?? { interestedCount: 0, notForUsCount: 0 }

                if (row[3] === 'interested') current.interestedCount += 1
                if (row[3] === 'not_for_us') current.notForUsCount += 1
                feedbackByGame.set(gameId, current)
            }
        }
        const recommendations = resultSet.rows
            .map(row => this._mapRecommendation(row, body.attendeeIds.length, body.availableMinutes, feedbackByGame.get(Number(row[0]))))
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
        const counts = await this.databaseService.getRecommendationCandidateCounts(
            body.attendeeIds,
            body.attendeeIds.length,
            body.availableMinutes,
        )
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

    private _mapRecommendation(
        row: { [key: number]: unknown },
        attendeeCount: number,
        availableMinutes?: number,
        feedback: { interestedCount: number; notForUsCount: number } = { interestedCount: 0, notForUsCount: 0 },
    ): RecommendationDto {
        const gameId = Number(row[0])
        const gameAvgDuration = row[2] === null || row[2] === undefined ? 0 : Number(row[2])
        const minPlayers = row[3] === null || row[3] === undefined ? 0 : Number(row[3])
        const maxPlayers = row[4] === null || row[4] === undefined ? 0 : Number(row[4])
        const titleEn = String(row[5] ?? row[6])
        const titleEs = String(row[6] ?? row[5])
        const attendeeOwnerCount = Number(row[7])
        const averageReview = row[8] === null || row[8] === undefined ? null : Number(row[8])
        const lastPlayedAt = row[9] === null || row[9] === undefined ? null : String(row[9])
        const durationScore =
            availableMinutes !== undefined && gameAvgDuration > 0
                ? Math.round(20 * Math.max(0, 1 - Math.abs(availableMinutes - gameAvgDuration) / availableMinutes))
                : 0
        const feedbackScore = Math.min(12, feedback.interestedCount * 4) - Math.min(12, feedback.notForUsCount * 6)
        const ownershipScore = Math.round(20 * (attendeeOwnerCount / attendeeCount))
        const ratingScore = averageReview === null ? 0 : Math.round(20 * (averageReview / 10))
        const reasons = [`Owned by ${attendeeOwnerCount} of ${attendeeCount} selected attendees`, `Fits ${attendeeCount} players`]

        if (availableMinutes !== undefined) {
            reasons.push(gameAvgDuration > 0 ? `Estimated duration: ${gameAvgDuration} minutes` : 'Duration is not available')
        }
        reasons.push(
            averageReview === null ? 'No selected-attendee rating yet' : `Selected-attendee rating: ${averageReview.toFixed(1)}/10`,
        )
        if (feedback.interestedCount > 0) {
            reasons.push(
                `${feedback.interestedCount} selected attendee${feedback.interestedCount === 1 ? '' : 's'} marked this as interesting`,
            )
        }
        if (feedback.notForUsCount > 0) {
            reasons.push(`${feedback.notForUsCount} selected attendee${feedback.notForUsCount === 1 ? '' : 's'} passed on this before`)
        }

        return {
            gameData: {
                id: gameId,
                title: titleEn,
                imageUrl: String(row[1]),
                gameAvgDuration,
                minPlayers,
                maxPlayers,
                titleTranslations: { en: titleEn, es: titleEs },
            },
            score: Math.max(0, Math.min(100, 40 + ownershipScore + ratingScore + durationScore + feedbackScore)),
            explanation: {
                reasons,
                attendeeOwnerCount,
                attendeeCount,
                averageReview,
                lastPlayedAt,
                interestedCount: feedback.interestedCount,
                notForUsCount: feedback.notForUsCount,
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
    async getRecommendationSignals(actorAccountId: number, groupId: number): Promise<RecommendationSignalsDto> {
        const group = await this.databaseService.getGroupById(groupId)

        if (group.rows.length === 0) {
            throw new NotFoundException(`Group with id ${groupId} not found`)
        }

        const memberIds = await this.databaseService.getGroupMemberIds(groupId)

        if (!memberIds.includes(actorAccountId)) {
            throw new ForbiddenException('You must belong to the group to view recommendation signals')
        }

        const resultSet = await this.databaseService.getRecommendationFeedbackForGroup(groupId)
        const latestByMemberAndGame = new Map<
            string,
            {
                gameId: number
                accountId: number
                feedback: string
                createdAt: string
                username: string
                displayName: string
                avatar: AvatarDto
            }
        >()

        for (const row of resultSet.rows) {
            const gameId = Number(row[1])
            const accountId = Number(row[2])
            const key = `${gameId}:${accountId}`

            if (latestByMemberAndGame.has(key)) continue

            latestByMemberAndGame.set(key, {
                gameId,
                accountId,
                feedback: String(row[3]),
                createdAt: String(row[4]),
                username: String(row[5]),
                displayName: String(row[6]),
                avatar: JSON.parse(String(row[7])) as AvatarDto,
            })
        }

        const signals = new Map<number, RecommendationSignalsDto['signals'][number]>()

        for (const signal of latestByMemberAndGame.values()) {
            if (signal.feedback !== 'interested' && signal.feedback !== 'not_for_us') continue

            const existing = signals.get(signal.gameId)
            const member: UserPublicDto = {
                id: signal.accountId,
                username: signal.username,
                displayName: signal.displayName,
                avatar: signal.avatar,
            }

            if (existing) {
                if (signal.accountId === actorAccountId) {
                    existing.yourFeedback = signal.feedback as 'interested' | 'not_for_us'
                }
                if (signal.feedback === 'interested') {
                    existing.interestedCount += 1
                    existing.interestedBy.push(member)
                } else {
                    existing.notForUsCount += 1
                }
                continue
            }

            signals.set(signal.gameId, {
                gameId: signal.gameId,
                interestedCount: signal.feedback === 'interested' ? 1 : 0,
                notForUsCount: signal.feedback === 'not_for_us' ? 1 : 0,
                yourFeedback: signal.accountId === actorAccountId ? (signal.feedback as 'interested' | 'not_for_us') : null,
                interestedBy: signal.feedback === 'interested' ? [member] : [],
                lastUpdatedAt: signal.createdAt,
            })
        }

        return {
            groupId,
            signals: [...signals.values()].sort(
                (a, b) => b.interestedCount - a.interestedCount || b.lastUpdatedAt.localeCompare(a.lastUpdatedAt) || a.gameId - b.gameId,
            ),
        }
    }

    @LogFeature(new Logger('PlayService'))
    async getUserGamesHistory(userId: number): Promise<Array<HistoryRecordDto>> {
        const meetsYouParticipatedIn = await this.databaseService.getDistinctCompletedMeetIdsForAccountHistory(userId)

        const history = await Promise.all(
            meetsYouParticipatedIn.map(async meetId => {
                const meetData = await this.meetsService.getMeetById(meetId, userId)

                if (meetData.status !== 'completed') {
                    return null
                }

                const attendedByIds = await this.databaseService.getMeetAttendedAccountIds(meetId)
                const gameIds = await this.databaseService.getPlayedGameIdsByMeetId(meetId)
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
                    attendedBy: await Promise.all(attendedByIds.map(async accountId => this.usersService.getPublicUserById(accountId))),
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
