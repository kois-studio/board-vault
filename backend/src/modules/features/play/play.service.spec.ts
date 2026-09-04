import { PlayService } from './play.service'

import type { DatabaseService } from '../../common/database/database.service'
import type { GameTranslationService } from '../../core/game-translation/game-translation.service'
import type { GamesService } from '../../core/games/games.service'
import type { MeetAccountGamesService } from '../../core/meet-account-games/meet-account-games.service'
import type { MeetsService } from '../../core/meets/meets.service'
import type { UsersService } from '../../core/users/users.service'

describe('PlayService history', () => {
    it('includes only completed sessions in personal history', async () => {
        const meetAccountGames = {
            getDistinctAccountIdsByMeetIdAndGameId: jest.fn().mockResolvedValue([1]),
        }
        const meets = {
            getMeetById: jest.fn().mockImplementation(async (meetId: number) => ({
                id: meetId,
                groupId: 7,
                createdBy: 1,
                meetDate: '2026-08-16T19:30:00.000Z',
                isConfirmed: meetId === 10,
                status: meetId === 10 ? 'completed' : 'cancelled',
                timezone: 'Europe/Madrid',
            })),
        }
        const database = {
            getMeetAttendedAccountIds: jest.fn().mockResolvedValue([1]),
            getDistinctCompletedMeetIdsForAccountHistory: jest.fn().mockResolvedValue([10, 11]),
            getPlayedGameIdsByMeetId: jest.fn().mockResolvedValue([42]),
        } as unknown as DatabaseService
        const service = new PlayService(
            { getPublicUserById: jest.fn().mockResolvedValue({ id: 1, username: 'dawichi' }) } as unknown as UsersService,
            database,
            { getGameById: jest.fn().mockResolvedValue({ id: 42, imageUrl: 'image' }) } as unknown as GamesService,
            meets as unknown as MeetsService,
            meetAccountGames as unknown as MeetAccountGamesService,
            { getGameTranslations: jest.fn().mockResolvedValue({ en: 'Game' }) } as unknown as GameTranslationService,
        )

        await expect(service.getUserGamesHistory(1)).resolves.toHaveLength(1)
        expect(database.getPlayedGameIdsByMeetId).toHaveBeenCalledTimes(1)
        expect(database.getPlayedGameIdsByMeetId).toHaveBeenCalledWith(10)
    })

    it('sorts a user meet list without mutating the database response contract', async () => {
        const meets = {
            getMeetsForAccount: jest.fn().mockResolvedValue([
                { id: 1, meetDate: '2026-08-10T19:30:00.000Z' },
                { id: 2, meetDate: '2026-08-16T19:30:00.000Z' },
            ]),
        }
        const service = new PlayService(
            {} as UsersService,
            {} as DatabaseService,
            {} as GamesService,
            meets as unknown as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(service.getUserMeets(1)).resolves.toEqual([
            { id: 2, meetDate: '2026-08-16T19:30:00.000Z' },
            { id: 1, meetDate: '2026-08-10T19:30:00.000Z' },
        ])
    })

    it('returns deterministic recommendations for selected attendees', async () => {
        const database = {
            getGroupById: jest.fn().mockResolvedValue({ rows: [[7]] }),
            getGroupMemberIds: jest.fn().mockResolvedValue([1, 2, 3]),
            getRecommendationFeedbackForGroup: jest.fn().mockResolvedValue({ rows: [] }),
            getRecommendationCandidates: jest.fn().mockResolvedValue({
                rows: [
                    [42, 'image-42', 90, 2, 5, 'Better Game', 'Mejor juego', 2, 8, '2026-08-01T19:30:00.000Z'],
                    [21, 'image-21', 120, 2, 5, 'Long Game', 'Juego largo', 1, null, null],
                ],
            }),
        }
        const service = new PlayService(
            {} as UsersService,
            database as unknown as DatabaseService,
            {} as GamesService,
            {} as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(
            service.getRecommendations(1, {
                groupId: 7,
                attendeeIds: [1, 2],
                availableMinutes: 120,
            }),
        ).resolves.toMatchObject({
            recommendations: [
                expect.objectContaining({ gameData: expect.objectContaining({ id: 42 }), score: 91 }),
                expect.objectContaining({ gameData: expect.objectContaining({ id: 21 }), score: 70 }),
            ],
            noResultReason: null,
        })
        expect(database.getRecommendationCandidates).toHaveBeenCalledWith([1, 2], 2, 120)
    })

    it('uses the latest selected-attendee feedback in the recommendation score and explanation', async () => {
        const database = {
            getGroupById: jest.fn().mockResolvedValue({ rows: [[7]] }),
            getGroupMemberIds: jest.fn().mockResolvedValue([1, 2]),
            getRecommendationCandidates: jest.fn().mockResolvedValue({
                rows: [[42, 'image-42', 90, 2, 5, 'Better Game', 'Mejor juego', 2, 8, null]],
            }),
            getRecommendationFeedbackForGroup: jest.fn().mockResolvedValue({
                rows: [
                    [8, 42, 1, 'interested', '2026-09-03 20:02:00'],
                    [7, 42, 1, 'not_for_us', '2026-09-03 20:01:00'],
                    [6, 42, 2, 'not_for_us', '2026-09-03 20:00:00'],
                ],
            }),
        }
        const service = new PlayService(
            {} as UsersService,
            database as unknown as DatabaseService,
            {} as GamesService,
            {} as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(service.getRecommendations(1, { groupId: 7, attendeeIds: [1, 2] })).resolves.toMatchObject({
            recommendations: [
                expect.objectContaining({
                    score: 74,
                    explanation: expect.objectContaining({ interestedCount: 1, notForUsCount: 1 }),
                }),
            ],
        })
    })

    it('rejects attendees who are not members of the selected group', async () => {
        const database = {
            getGroupById: jest.fn().mockResolvedValue({ rows: [[7]] }),
            getGroupMemberIds: jest.fn().mockResolvedValue([1, 2]),
        }
        const service = new PlayService(
            {} as UsersService,
            database as unknown as DatabaseService,
            {} as GamesService,
            {} as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(service.getRecommendations(1, { groupId: 7, attendeeIds: [1, 99] })).rejects.toThrow(
            'Every attendee must belong to the selected group',
        )
    })

    it('explains which recommendation constraint produced an empty result', async () => {
        const database = {
            getGroupById: jest.fn().mockResolvedValue({ rows: [[7]] }),
            getGroupMemberIds: jest.fn().mockResolvedValue([1, 2]),
            getRecommendationCandidates: jest.fn().mockResolvedValue({ rows: [] }),
            getRecommendationCandidateCounts: jest.fn().mockResolvedValue({ rows: [[4, 2, 0]] }),
        }
        const service = new PlayService(
            {} as UsersService,
            database as unknown as DatabaseService,
            {} as GamesService,
            {} as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(service.getRecommendations(1, { groupId: 7, attendeeIds: [1, 2], availableMinutes: 60 })).resolves.toMatchObject({
            noResultReason: 'No games for 2 players fit within 60 minutes.',
        })
        expect(database.getRecommendationCandidateCounts).toHaveBeenCalledWith([1, 2], 2, 60)
    })

    it('persists recommendation feedback only for selected-attendee-owned games', async () => {
        const database = {
            getGroupById: jest.fn().mockResolvedValue({ rows: [[7]] }),
            getGroupMemberIds: jest.fn().mockResolvedValue([1, 2, 3]),
            getOwnedGameByAnyAccount: jest.fn().mockResolvedValue({ rows: [[1]] }),
            createRecommendationFeedback: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
        }
        const service = new PlayService(
            {} as UsersService,
            database as unknown as DatabaseService,
            {} as GamesService,
            {} as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(
            service.createRecommendationFeedback(1, {
                groupId: 7,
                gameId: 42,
                attendeeIds: [1, 2],
                feedback: 'not_for_us',
            }),
        ).resolves.toEqual({ success: true })
        expect(database.createRecommendationFeedback).toHaveBeenCalledWith({
            accountId: 1,
            groupId: 7,
            gameId: 42,
            attendeeIds: '[1,2]',
            feedback: 'not_for_us',
        })
    })

    it('rejects recommendation feedback for games absent from selected attendees', async () => {
        const database = {
            getGroupById: jest.fn().mockResolvedValue({ rows: [[7]] }),
            getGroupMemberIds: jest.fn().mockResolvedValue([1, 2]),
            getOwnedGameByAnyAccount: jest.fn().mockResolvedValue({ rows: [] }),
            createRecommendationFeedback: jest.fn(),
        }
        const service = new PlayService(
            {} as UsersService,
            database as unknown as DatabaseService,
            {} as GamesService,
            {} as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(
            service.createRecommendationFeedback(1, {
                groupId: 7,
                gameId: 42,
                attendeeIds: [1, 2],
                feedback: 'not_for_us',
            }),
        ).rejects.toThrow('The selected attendees do not own this game')
        expect(database.createRecommendationFeedback).not.toHaveBeenCalled()
    })

    it('returns the latest group recommendation signals per member and game', async () => {
        const avatar = JSON.stringify({ backgroundColor: '#000', iconName: null, emoji: '🎲', type: 'emoji', initials: 'D' })
        const database = {
            getGroupById: jest.fn().mockResolvedValue({ rows: [[7]] }),
            getGroupMemberIds: jest.fn().mockResolvedValue([1, 2]),
            getRecommendationFeedbackForGroup: jest.fn().mockResolvedValue({
                rows: [
                    [5, 42, 1, 'not_for_us', '2026-09-03 20:02:00', 'dawichi', 'David', avatar],
                    [4, 42, 1, 'interested', '2026-09-03 20:01:00', 'dawichi', 'David', avatar],
                    [3, 42, 2, 'interested', '2026-09-03 20:00:00', 'friend', 'Friend', avatar],
                ],
            }),
        }
        const service = new PlayService(
            {} as UsersService,
            database as unknown as DatabaseService,
            {} as GamesService,
            {} as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(service.getRecommendationSignals(1, 7)).resolves.toEqual({
            groupId: 7,
            signals: [
                {
                    gameId: 42,
                    interestedCount: 1,
                    notForUsCount: 1,
                    yourFeedback: 'not_for_us',
                    interestedBy: [{ id: 2, username: 'friend', displayName: 'Friend', avatar: JSON.parse(avatar) }],
                    lastUpdatedAt: '2026-09-03 20:02:00',
                },
            ],
        })
    })

    it('rejects recommendation signals for non-members', async () => {
        const database = {
            getGroupById: jest.fn().mockResolvedValue({ rows: [[7]] }),
            getGroupMemberIds: jest.fn().mockResolvedValue([2]),
            getRecommendationFeedbackForGroup: jest.fn(),
        }
        const service = new PlayService(
            {} as UsersService,
            database as unknown as DatabaseService,
            {} as GamesService,
            {} as MeetsService,
            {} as MeetAccountGamesService,
            {} as GameTranslationService,
        )

        await expect(service.getRecommendationSignals(1, 7)).rejects.toThrow('You must belong to the group to view recommendation signals')
        expect(database.getRecommendationFeedbackForGroup).not.toHaveBeenCalled()
    })
})
