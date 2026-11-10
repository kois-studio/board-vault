import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator.js'
import { titleFieldsFromRow } from '../../../common/utils/game-title.js'
import { toIsoDate } from '../../../common/utils/stored-date.js'
import { DatabaseService } from '../../common/database/database.service.js'
import { GameTranslationService } from '../../core/game-translation/game-translation.service.js'
import { GamesService } from '../../core/games/games.service.js'
import { MeetAccountGamesService } from '../../core/meet-account-games/meet-account-games.service.js'
import { MeetsService } from '../../core/meets/meets.service.js'
import { UsersService } from '../../core/users/users.service.js'

import { buildHistoryRecords } from './history-records.js'
import { HISTORY_PAGE_SIZE } from './play.types.js'
import { englishNoResultReason, englishReason } from './recommendation-reasons.js'

import type {
    HistoryPageDto,
    HistoryRecordDto,
    HistoryQuery,
    HistorySummaryDto,
    HistorySummaryQuery,
    NoResultReasonDto,
    RecommendationReasonDto,
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
import type { Locale } from '../../../common/i18n/locale.js'
import type { AccountMeetDto } from '../../../common/types/meet.type.js'
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
    async getRecommendations(actorAccountId: number, body: RecommendationRequestBody, locale: Locale): Promise<RecommendationsDto> {
        const memberIds = await this.existingGroupMemberIds(body.groupId)

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
            locale,
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

        const noResultReasonCode = recommendations.length === 0 ? await this._getNoResultReason(body) : null

        return {
            groupId: body.groupId,
            attendeeIds: body.attendeeIds,
            availableMinutes: body.availableMinutes ?? null,
            decisionLens,
            recommendations,
            noResultReason: noResultReasonCode && englishNoResultReason(noResultReasonCode),
            noResultReasonCode,
        }
    }

    async getParticipantRecommendations(
        actorAccountId: number,
        body: ParticipantRecommendationRequestBody,
        locale: Locale,
    ): Promise<RecommendationsDto> {
        const [memberIds, people] = await Promise.all([
            this.existingGroupMemberIds(body.groupId),
            this.databaseService.groups.getGroupPeople(body.groupId),
        ])

        if (!memberIds.includes(actorAccountId)) {
            throw new ForbiddenException('You must belong to the group to get recommendations')
        }

        const activePersonIds = new Set(people.rows.filter(row => row[10] === 'member').map(row => Number(row[0])))

        if (body.groupPersonIds.some(personId => !activePersonIds.has(personId))) {
            throw new BadRequestException('Every selected person must belong to the group')
        }

        const decisionLens = body.decisionLens ?? 'balanced'
        const resultSet = await this.databaseService.recommendations.getGroupPersonRecommendationCandidates(
            body.groupId,
            body.groupPersonIds,
            body.groupPersonIds.length,
            locale,
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
            noResultReason: recommendations.length === 0 ? englishNoResultReason({ code: 'no_people_games' }) : null,
            noResultReasonCode: recommendations.length === 0 ? { code: 'no_people_games' } : null,
        }
    }

    async createParticipantRecommendationFeedback(
        actorAccountId: number,
        body: ParticipantRecommendationFeedbackBody,
    ): Promise<RecommendationFeedbackDto> {
        const [memberIds, people] = await Promise.all([
            this.existingGroupMemberIds(body.groupId),
            this.databaseService.groups.getGroupPeople(body.groupId),
        ])

        if (!memberIds.includes(actorAccountId)) {
            throw new ForbiddenException('You must belong to the group to submit recommendation feedback')
        }

        const activePersonIds = new Set(people.rows.filter(row => row[10] === 'member').map(row => Number(row[0])))

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

    /**
     * The member account ids of a group, read together with the check that the group exists (404 when
     * it is gone) instead of one after the other (#251). Every recommendation route starts with both.
     */
    private async existingGroupMemberIds(groupId: number): Promise<Array<number>> {
        const [group, memberIds] = await Promise.all([
            this.databaseService.groups.getGroupById(groupId),
            this.databaseService.groups.getGroupMemberIds(groupId),
        ])

        if (group.rows.length === 0) {
            throw new NotFoundException(`Group with id ${groupId} not found`)
        }

        return memberIds
    }

    private async _getNoResultReason(body: RecommendationRequestBody): Promise<NoResultReasonDto> {
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
            return { code: 'no_owned_games' }
        }
        if (playerFitCount === 0) {
            return { code: 'no_player_fit', values: { players: body.attendeeIds.length } }
        }
        if (body.availableMinutes !== undefined && durationFitCount === 0) {
            return { code: 'no_duration_fit', values: { players: body.attendeeIds.length, minutes: body.availableMinutes } }
        }

        return { code: 'no_titled_games' }
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
        const reasonCodes: Array<RecommendationReasonDto> = [
            {
                code: 'owned_by',
                values: { owners: attendeeOwnerCount, attendees: attendeeCount, people: participantNames.length > 0 ? 1 : 0 },
            },
            { code: 'fits_players', values: { players: attendeeCount } },
        ]

        if (availableMinutes !== undefined) {
            reasonCodes.push(
                gameAvgDuration > 0 ? { code: 'duration', values: { minutes: gameAvgDuration } } : { code: 'duration_unknown' },
            )
        }
        reasonCodes.push(
            averageReview === null ? { code: 'no_rating' } : { code: 'rating', values: { rating: Math.round(averageReview * 10) / 10 } },
        )
        if (feedback.interestedCount > 0) {
            reasonCodes.push({ code: 'interested', values: { count: feedback.interestedCount } })
        }
        if (feedback.notForUsCount > 0) {
            reasonCodes.push({ code: 'passed_before', values: { count: feedback.notForUsCount } })
        }
        if (participantPreferenceScore > 0) {
            reasonCodes.push({ code: 'preferences_favor' })
        } else if (participantPreferenceScore < 0) {
            reasonCodes.push({ code: 'marked_avoid' })
        }
        if (decisionLens === 'fresh') {
            reasonCodes.push({ code: lastPlayedAt === null ? 'not_played_yet' : 'played_before' })
        } else if (decisionLens === 'favorite') {
            reasonCodes.push({ code: averageReview !== null && averageReview >= 7 ? 'strong_rating' : 'shared_shelf' })
        }
        const reasons = reasonCodes.map(englishReason)

        return {
            gameData: {
                id: gameId,
                imageUrl: String(row[1]),
                gameAvgDuration,
                minPlayers,
                maxPlayers,
                ...titleFieldsFromRow(row[5], row[6]),
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
                reasonCodes,
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
        const memberIds = await this.existingGroupMemberIds(body.groupId)

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
        const memberIds = await this.existingGroupMemberIds(groupId)

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

    /**
     * One page of the caller's history, newest first (#252): its size and its queries no longer grow with
     * every night ever played. `before` is the id of the last night of the previous page.
     */
    @LogFeature(new Logger('PlayService'))
    async getUserGamesHistory(userId: number, query: HistoryQuery, locale: Locale): Promise<HistoryPageDto> {
        const limit = query.limit ?? HISTORY_PAGE_SIZE
        const filters = { groupId: query.groupId, gameId: query.gameId }
        // One more than the page, to know whether older nights remain.
        const ids = await this.databaseService.sessions.getHistoryMeetIdsPage(userId, filters, query.before ?? null, limit + 1)

        return { entries: await this.historyRecordsFor(ids.slice(0, limit), userId, locale), hasMore: ids.length > limit }
    }

    /** Every night at once, for the previous frontend release only (`GET /history`, deprecated by #252). */
    @LogFeature(new Logger('PlayService'))
    async getUserGamesHistoryAll(userId: number, locale: Locale): Promise<Array<HistoryRecordDto>> {
        const ids = await this.databaseService.sessions.getHistoryMeetIdsPage(userId, {}, null, null)

        return this.historyRecordsFor(ids, userId, locale)
    }

    /** The history records of these nights, in this order. */
    private async historyRecordsFor(meetIds: Array<number>, userId: number, locale: Locale): Promise<Array<HistoryRecordDto>> {
        if (meetIds.length === 0) return []

        const found = new Map((await this.meetsService.getMeetsByIdsForAccount(meetIds, userId)).map(meet => [meet.id, meet]))
        const meets = meetIds.flatMap(id => {
            const meet = found.get(id)

            return meet?.status === 'completed' ? [meet] : []
        })

        return buildHistoryRecords(meets, {
            databaseService: this.databaseService,
            gamesService: this.gamesService,
            gameTranslationService: this.gameTranslationService,
            usersService: this.usersService,
            locale,
            meetAccountGamesService: this.meetAccountGamesService,
        })
    }

    /** Totals over the caller's whole history, optionally for one group, in a fixed number of queries (#252). */
    @LogFeature(new Logger('PlayService'))
    async getUserHistorySummary(userId: number, query: HistorySummaryQuery, locale: Locale): Promise<HistorySummaryDto> {
        const summary = await this.databaseService.sessions.getHistorySummary(userId, { groupId: query.groupId, gameId: query.gameId })
        const gameIds = [...new Set([...summary.mostPlayedCandidates, ...summary.myMostPlayed].map(game => game.gameId))]
        const games = new Map(
            (await this.gameTranslationService.withTitles([...(await this.gamesService.getGamesByIds(gameIds)).values()], locale)).map(
                game => [game.id, game],
            ),
        )
        // The game played on the most nights; a tie goes to the first title, as the reader would sort them.
        const collator = new Intl.Collator(locale)
        const [mostPlayed] = summary.mostPlayedCandidates
            .flatMap(candidate => {
                const game = games.get(candidate.gameId)

                return game ? [{ game, nights: candidate.nights }] : []
            })
            .sort((a, b) => collator.compare(a.game.title, b.game.title))

        return {
            nights: summary.nights,
            gamesPlayed: summary.gamesPlayed,
            uniqueGames: summary.uniqueGames,
            people: summary.people,
            mostPlayed: mostPlayed ?? null,
            myMostPlayed: summary.myMostPlayed.flatMap(line => {
                const game = games.get(line.gameId)

                return game ? [{ game, plays: line.plays, wins: line.wins }] : []
            }),
        }
    }

    @LogFeature(new Logger('PlayService'))
    async getUserMeets(userId: number): Promise<Array<AccountMeetDto>> {
        const meets = await this.meetsService.getMeetsForAccount(userId)

        return meets.sort((a, b) => new Date(b.meetDate).getTime() - new Date(a.meetDate).getTime())
    }
}
