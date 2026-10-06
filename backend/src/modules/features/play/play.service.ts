import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator.js'
import { toIsoDate } from '../../../common/utils/stored-date.js'
import { DatabaseService } from '../../common/database/database.service.js'
import { GameTranslationService } from '../../core/game-translation/game-translation.service.js'
import { GamesService } from '../../core/games/games.service.js'
import { MeetAccountGamesService } from '../../core/meet-account-games/meet-account-games.service.js'
import { MeetsService } from '../../core/meets/meets.service.js'
import { UsersService } from '../../core/users/users.service.js'

import { buildHistoryRecords } from './history-records.js'

import type {
    HistoryRecordDto,
    RecommendationDto,
    RecommendationFeedbackBody,
    ParticipantRecommendationFeedbackBody,
    RecommendationFeedbackDto,
    RecommendationRequestBody,
    ParticipantRecommendationRequestBody,
    RecommendationDecisionLens,
    RecommendationSignalsDto,
    RecommendationsDto,
} from './play.types.js'
import type { MeetDto } from '../../../common/types/meet.type.js'
import type { AvatarDto, UserPublicDto } from '../../../common/types/user.type.js'

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
        const group = await this.databaseService.groups.getGroupById(body.groupId)

        if (group.rows.length === 0) {
            throw new NotFoundException(`Group with id ${body.groupId} not found`)
        }

        const memberIds = await this.databaseService.groups.getGroupMemberIds(body.groupId)

        if (!memberIds.includes(actorAccountId)) {
            throw new ForbiddenException('You must belong to the group to get recommendations')
        }

        if (body.attendeeIds.some(accountId => !memberIds.includes(accountId))) {
            throw new BadRequestException('Every attendee must belong to the selected group')
        }

        const resultSet = await this.databaseService.recommendations.getRecommendationCandidates(
            body.groupId,
            body.attendeeIds,
            body.attendeeIds.length,
            body.availableMinutes,
        )
        const decisionLens = body.decisionLens ?? 'balanced'
        const feedbackByGame = new Map<number, { interestedCount: number; notForUsCount: number }>()

        if (resultSet.rows.length > 0) {
            const feedbackResult = await this.databaseService.recommendations.getRecommendationFeedbackForGroup(body.groupId)
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
            .map(row =>
                this._mapRecommendation(
                    row,
                    body.attendeeIds.length,
                    body.availableMinutes,
                    feedbackByGame.get(Number(row[0])),
                    decisionLens,
                ),
            )
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
            decisionLens,
            recommendations,
            noResultReason,
        }
    }

    async getParticipantRecommendations(actorAccountId: number, body: ParticipantRecommendationRequestBody): Promise<RecommendationsDto> {
        const group = await this.databaseService.groups.getGroupById(body.groupId)

        if (group.rows.length === 0) {
            throw new NotFoundException(`Group with id ${body.groupId} not found`)
        }

        const memberIds = await this.databaseService.groups.getGroupMemberIds(body.groupId)

        if (!memberIds.includes(actorAccountId)) {
            throw new ForbiddenException('You must belong to the group to get recommendations')
        }

        const people = await this.databaseService.groups.getGroupPeople(body.groupId)
        const activePersonIds = new Set(people.rows.filter(row => String(row[4]) === 'active').map(row => Number(row[0])))

        if (body.groupPersonIds.some(personId => !activePersonIds.has(personId))) {
            throw new BadRequestException('Every selected person must belong to the group')
        }

        const decisionLens = body.decisionLens ?? 'balanced'
        const resultSet = await this.databaseService.recommendations.getGroupPersonRecommendationCandidates(
            body.groupId,
            body.groupPersonIds,
            body.groupPersonIds.length,
            body.availableMinutes,
        )
        const feedbackByGame = new Map<number, { interestedCount: number; notForUsCount: number }>()
        const feedbackResult = await this.databaseService.recommendations.getParticipantRecommendationFeedbackForGroup(body.groupId)
        const selectedPeople = new Set(body.groupPersonIds)
        const selectedPersonNames = body.groupPersonIds
            .map(personId => people.rows.find(row => Number(row[0]) === personId))
            .filter((row): row is (typeof people.rows)[number] => row !== undefined)
            .map(row => String(row[5]))
        const latestByPersonAndGame = new Set<string>()

        for (const row of feedbackResult.rows) {
            const gameId = Number(row[1])
            const participantIds = this._parseIdList(row[3])

            for (const participantId of participantIds) {
                if (!selectedPeople.has(participantId)) continue
                const key = `${gameId}:${participantId}`

                if (latestByPersonAndGame.has(key)) continue
                latestByPersonAndGame.add(key)
                const current = feedbackByGame.get(gameId) ?? { interestedCount: 0, notForUsCount: 0 }

                if (row[4] === 'interested') current.interestedCount += 1
                if (row[4] === 'not_for_us') current.notForUsCount += 1
                feedbackByGame.set(gameId, current)
            }
        }
        const recommendations = resultSet.rows
            .map(row =>
                this._mapRecommendation(
                    row,
                    body.groupPersonIds.length,
                    body.availableMinutes,
                    feedbackByGame.get(Number(row[0])),
                    decisionLens,
                    Number(row[10] ?? 0),
                    selectedPersonNames,
                ),
            )
            .sort((a, b) => b.score - a.score || a.gameData.id - b.gameData.id)
            .slice(0, 10)

        return {
            groupId: body.groupId,
            attendeeIds: [],
            participantIds: body.groupPersonIds,
            availableMinutes: body.availableMinutes ?? null,
            decisionLens,
            recommendations,
            noResultReason: recommendations.length === 0 ? 'No games are available from the selected group people.' : null,
        }
    }

    async createParticipantRecommendationFeedback(
        actorAccountId: number,
        body: ParticipantRecommendationFeedbackBody,
    ): Promise<RecommendationFeedbackDto> {
        const group = await this.databaseService.groups.getGroupById(body.groupId)

        if (group.rows.length === 0) throw new NotFoundException(`Group with id ${body.groupId} not found`)

        const memberIds = await this.databaseService.groups.getGroupMemberIds(body.groupId)

        if (!memberIds.includes(actorAccountId)) {
            throw new ForbiddenException('You must belong to the group to submit recommendation feedback')
        }

        const people = await this.databaseService.groups.getGroupPeople(body.groupId)
        const activePersonIds = new Set(people.rows.filter(row => String(row[4]) === 'active').map(row => Number(row[0])))

        if (body.participantIds.some(personId => !activePersonIds.has(personId))) {
            throw new BadRequestException('Every participant must belong to the selected group')
        }

        const availableGameIds = await this.databaseService.groups.getGroupAvailableGameIdsForPeople(body.groupId, body.participantIds)

        if (!availableGameIds.includes(body.gameId)) {
            throw new BadRequestException('The selected group people do not own this game')
        }

        await this.databaseService.recommendations.createParticipantRecommendationFeedback({
            accountId: actorAccountId,
            groupId: body.groupId,
            gameId: body.gameId,
            participantIds: JSON.stringify(body.participantIds),
            feedback: body.feedback,
        })

        return { success: true }
    }

    private async _getNoResultReason(body: RecommendationRequestBody): Promise<string> {
        const counts = await this.databaseService.recommendations.getRecommendationCandidateCounts(
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
        decisionLens: RecommendationDecisionLens = 'balanced',
        participantPreferenceScore = 0,
        participantNames: Array<string> = [],
    ): RecommendationDto {
        const gameId = Number(row[0])
        const gameAvgDuration = row[2] === null || row[2] === undefined ? 0 : Number(row[2])
        const minPlayers = row[3] === null || row[3] === undefined ? 0 : Number(row[3])
        const maxPlayers = row[4] === null || row[4] === undefined ? 0 : Number(row[4])
        const titleEn = String(row[5] ?? row[6])
        const titleEs = String(row[6] ?? row[5])
        const attendeeOwnerCount = Number(row[7])
        const averageReview = row[8] === null || row[8] === undefined ? null : Number(row[8])
        const lastPlayedAt = row[9] === null || row[9] === undefined ? null : toIsoDate(String(row[9]))
        const durationScore =
            availableMinutes !== undefined && gameAvgDuration > 0
                ? Math.round(20 * Math.max(0, 1 - Math.abs(availableMinutes - gameAvgDuration) / availableMinutes))
                : 0
        const feedbackScore = Math.min(12, feedback.interestedCount * 4) - Math.min(12, feedback.notForUsCount * 6)
        const participantPreferenceAdjustment = Math.max(-12, Math.min(12, participantPreferenceScore * 2))
        const decisionLensScore =
            decisionLens === 'fresh'
                ? lastPlayedAt === null
                    ? 20
                    : -12
                : decisionLens === 'favorite'
                  ? (averageReview !== null && averageReview >= 7 ? 8 : 0) + (lastPlayedAt !== null ? 3 : 0)
                  : 0
        const ownershipScore = Math.round(20 * (attendeeOwnerCount / attendeeCount))
        const ratingScore = averageReview === null ? 0 : Math.round(20 * (averageReview / 10))
        // The names of the people coming are not the owners or the people with preferences, so the
        // reasons give counts only.
        const selectedLabel = participantNames.length > 0 ? 'selected people' : 'selected attendees'
        const reasons = [`Owned by ${attendeeOwnerCount} of ${attendeeCount} ${selectedLabel}`, `Fits ${attendeeCount} players`]

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
            reasons.push(`${feedback.notForUsCount} selected participant${feedback.notForUsCount === 1 ? '' : 's'} passed on this before`)
        }
        if (participantPreferenceScore > 0) {
            reasons.push('The preferences of the people coming favor this game')
        } else if (participantPreferenceScore < 0) {
            reasons.push(`Some selected people have marked this game to avoid`)
        }
        if (decisionLens === 'fresh') {
            reasons.push(lastPlayedAt === null ? 'Not played by this group yet' : 'Previously played by this group')
        } else if (decisionLens === 'favorite') {
            reasons.push(averageReview !== null && averageReview >= 7 ? 'Strong group rating' : 'Builds on the group’s shared shelf')
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
            score: Math.max(
                0,
                Math.min(
                    100,
                    40 + ownershipScore + ratingScore + durationScore + feedbackScore + decisionLensScore + participantPreferenceAdjustment,
                ),
            ),
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

    private _parseIdList(value: unknown): Array<number> {
        try {
            const parsed = JSON.parse(String(value))

            return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isInteger) : []
        } catch {
            return []
        }
    }

    @LogFeature(new Logger('PlayService'))
    async createRecommendationFeedback(actorAccountId: number, body: RecommendationFeedbackBody): Promise<RecommendationFeedbackDto> {
        const group = await this.databaseService.groups.getGroupById(body.groupId)

        if (group.rows.length === 0) {
            throw new NotFoundException(`Group with id ${body.groupId} not found`)
        }

        const memberIds = await this.databaseService.groups.getGroupMemberIds(body.groupId)

        if (!memberIds.includes(actorAccountId)) {
            throw new ForbiddenException('You must belong to the group to submit recommendation feedback')
        }

        if (body.attendeeIds.some(accountId => !memberIds.includes(accountId))) {
            throw new BadRequestException('Every attendee must belong to the selected group')
        }

        const ownedGame = await this.databaseService.recommendations.getOwnedGameByAnyAccount(body.gameId, body.attendeeIds)

        if (ownedGame.rows.length === 0) {
            throw new BadRequestException('The selected attendees do not own this game')
        }

        await this.databaseService.recommendations.createRecommendationFeedback({
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
        const group = await this.databaseService.groups.getGroupById(groupId)

        if (group.rows.length === 0) {
            throw new NotFoundException(`Group with id ${groupId} not found`)
        }

        const memberIds = await this.databaseService.groups.getGroupMemberIds(groupId)

        if (!memberIds.includes(actorAccountId)) {
            throw new ForbiddenException('You must belong to the group to view recommendation signals')
        }

        const resultSet = await this.databaseService.recommendations.getRecommendationFeedbackForGroup(groupId)
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
        const meetIds = await this.databaseService.sessions.getDistinctCompletedMeetIdsForAccountHistory(userId)
        const meets = (await this.meetsService.getMeetsByIdsForAccount(meetIds, userId)).filter(meet => meet.status === 'completed')

        return buildHistoryRecords(meets, {
            databaseService: this.databaseService,
            gamesService: this.gamesService,
            gameTranslationService: this.gameTranslationService,
            usersService: this.usersService,
            meetAccountGamesService: this.meetAccountGamesService,
        })
    }

    @LogFeature(new Logger('PlayService'))
    async getUserMeets(userId: number): Promise<Array<MeetDto>> {
        const meets = await this.meetsService.getMeetsForAccount(userId)

        return meets.sort((a, b) => new Date(b.meetDate).getTime() - new Date(a.meetDate).getTime())
    }
}
