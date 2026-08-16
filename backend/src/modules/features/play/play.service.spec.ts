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
        const service = new PlayService(
            { getPublicUserById: jest.fn().mockResolvedValue({ id: 1, username: 'dawichi' }) } as unknown as UsersService,
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
})
