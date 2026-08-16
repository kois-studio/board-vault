import type { DatabaseService } from '../../common/database/database.service'
import type { GameTranslationService } from '../../core/game-translation/game-translation.service'
import type { GamesService } from '../../core/games/games.service'
import type { MeetAccountGamesService } from '../../core/meet-account-games/meet-account-games.service'
import type { MeetsService } from '../../core/meets/meets.service'
import type { UsersService } from '../../core/users/users.service'

import { PlayService } from './play.service'

describe('PlayService history', () => {
    it('includes only completed sessions in personal history', async () => {
        const meetAccountGames = {
            getDistinctMeetIdsByAccountId: jest.fn().mockResolvedValue([10, 11]),
            getDistinctGameIdsByMeetId: jest.fn().mockResolvedValue([42]),
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
        const database = {} as DatabaseService
        const service = new PlayService(
            { getPublicUserById: jest.fn().mockResolvedValue({ id: 1, username: 'example-contributor' }) } as unknown as UsersService,
            database,
            { getGameById: jest.fn().mockResolvedValue({ id: 42, imageUrl: 'image' }) } as unknown as GamesService,
            meets as unknown as MeetsService,
            meetAccountGames as unknown as MeetAccountGamesService,
            { getGameTranslations: jest.fn().mockResolvedValue({ en: 'Game' }) } as unknown as GameTranslationService,
        )

        await expect(service.getUserGamesHistory(1)).resolves.toHaveLength(1)
        expect(meetAccountGames.getDistinctGameIdsByMeetId).toHaveBeenCalledTimes(1)
        expect(meetAccountGames.getDistinctGameIdsByMeetId).toHaveBeenCalledWith(10)
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
})
