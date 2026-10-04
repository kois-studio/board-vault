import { fakeDatabase } from '../../../../test/fake-database'

import { DashboardService } from './dashboard.service'

describe('DashboardService group history', () => {
    it('returns completed sessions only', async () => {
        const meets = {
            getMeetsByGroupId: jest.fn().mockResolvedValue([
                {
                    id: 10,
                    groupId: 7,
                    createdBy: 1,
                    meetDate: '2026-08-10T19:30:00.000Z',
                    isConfirmed: true,
                    status: 'completed',
                    timezone: 'Europe/Madrid',
                },
                {
                    id: 11,
                    groupId: 7,
                    createdBy: 1,
                    meetDate: '2026-08-17T19:30:00.000Z',
                    isConfirmed: false,
                    status: 'scheduled',
                    timezone: 'Europe/Madrid',
                },
            ]),
        }
        const meetAccountGames = {
            getDistinctAccountIdsByMeetIdAndGameId: jest.fn().mockResolvedValue([]),
        }
        const empty = new Map()
        const database = {
            getHistoryDetailsByMeetIds: jest.fn().mockResolvedValue({
                attendedAccountIds: empty,
                attendedPersonIds: empty,
                playedGameIds: empty,
                personPlays: empty,
                accountPlays: empty,
            }),
            getGroupPeople: jest.fn().mockResolvedValue({ rows: [] }),
        }

        const service = new DashboardService(
            { getPublicUsersByIds: jest.fn().mockResolvedValue(new Map()) } as never,
            fakeDatabase(database),
            {} as never,
            {} as never,
            {} as never,
            { getGamesByIds: jest.fn().mockResolvedValue(new Map()) } as never,
            {} as never,
            meets as never,
            { getTranslationsByGameIds: jest.fn().mockResolvedValue(new Map()) } as never,
            meetAccountGames as never,
            {} as never,
            {} as never,
        )

        await expect(service.getGroupMeetings(1, 7)).resolves.toHaveLength(1)
        expect(database.getHistoryDetailsByMeetIds).toHaveBeenCalledWith([10])
    })
})

describe('DashboardService group creation', () => {
    it('returns the created group identifier for the onboarding handoff', async () => {
        const database = {
            createGroupWithMembership: jest.fn().mockResolvedValue({ groupId: 42 }),
        }
        const service = new DashboardService(
            {} as never,
            fakeDatabase(database),
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
        )

        await expect(service.createGroup(7, 'Friday Crew')).resolves.toEqual({ success: true, groupId: 42 })
        expect(database.createGroupWithMembership).toHaveBeenCalledWith({ name: 'Friday Crew', createdBy: 7 })
    })
})

describe('DashboardService groups overview', () => {
    it('loads members, games, and titles once, however many games members own', async () => {
        const owned = (accountId: number) => [1, 2, 3].map(n => ({ accountId, gameId: accountId * 10 + n }))
        const users = {
            getPublicUsersByIds: jest.fn(async (ids: Array<number>) => new Map(ids.map(id => [id, { id, username: `u${id}` }]))),
        }
        const games = {
            getGamesByIds: jest.fn(async (ids: Array<number>) => new Map(ids.map(id => [id, { id, imageUrl: '' }]))),
            getGameById: jest.fn(),
        }
        const translations = {
            getTranslationsByGameIds: jest.fn(async (ids: Array<number>) => new Map(ids.map(id => [id, { en: `Game ${id}`, es: '' }]))),
            getGameTranslations: jest.fn(),
        }
        const database = {
            getActivePlaceholdersByGroupIds: jest
                .fn()
                .mockResolvedValue({ rows: [{ id: 9, groupId: 2, displayName: 'Lucía', avatar: null }] }),
            getAssertedOwnershipByGroupIds: jest.fn().mockResolvedValue({ rows: [{ groupPersonId: 9, gameId: 77 }] }),
        }
        const service = new DashboardService(
            users as never,
            fakeDatabase(database),
            { getGroupById: jest.fn(async (id: number) => ({ id, name: `Group ${id}`, createdBy: 1 })) } as never,
            {
                getGroupMembershipsByAccountId: jest.fn().mockResolvedValue([{ groupId: 1 }, { groupId: 2 }]),
                getGroupMembershipsByGroupId: jest.fn().mockResolvedValue([
                    { accountId: 1, joinedAt: '2026-01-01' },
                    { accountId: 2, joinedAt: '2026-01-02' },
                ]),
            } as never,
            { getGamesOwnedByAccountId: jest.fn(async (id: number) => owned(id)) } as never,
            games as never,
            { getGameReviewsByAccountId: jest.fn().mockResolvedValue([]) } as never,
            {} as never,
            translations as never,
            {} as never,
            {} as never,
            {} as never,
        )

        const groups = await service.getGroupsOfUser(1)

        expect(groups).toHaveLength(2)
        expect(groups[0]?.members[1]?.games.map(game => game.titleTranslations.en)).toEqual(['Game 21', 'Game 22', 'Game 23'])
        expect(users.getPublicUsersByIds).toHaveBeenCalledTimes(1)
        expect(games.getGamesByIds).toHaveBeenCalledTimes(1)
        expect(translations.getTranslationsByGameIds).toHaveBeenCalledTimes(1)
        expect(games.getGameById).not.toHaveBeenCalled()
        expect(groups[0]?.placeholders).toEqual([])
        expect(groups[1]?.placeholders).toEqual([{ id: 9, displayName: 'Lucía', avatar: null, gameIds: [77] }])
        expect(database.getActivePlaceholdersByGroupIds).toHaveBeenCalledTimes(1)
        expect(translations.getGameTranslations).not.toHaveBeenCalled()
    })
})
