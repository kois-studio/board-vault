import { fakeActivityNotifier } from '../../../../test/fake-activity-notifier.js'
import { fakeDatabase } from '../../../../test/fake-database.js'

import { DashboardService } from './dashboard.service.js'

describe('DashboardService group history', () => {
    it('returns completed sessions only', async () => {
        const meets = {
            getMeetsByGroupId: vi.fn().mockResolvedValue([
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
            getDistinctAccountIdsByMeetIdAndGameId: vi.fn().mockResolvedValue([]),
        }
        const empty = new Map()
        const database = {
            getHistoryDetailsByMeetIds: vi.fn().mockResolvedValue({
                attendedAccountIds: empty,
                attendedPersonIds: empty,
                playedGameIds: empty,
                personPlays: empty,
                accountPlays: empty,
            }),
            getGroupPeople: vi.fn().mockResolvedValue({ rows: [] }),
        }

        const service = new DashboardService(
            { getPublicUsersByIds: vi.fn().mockResolvedValue(new Map()) } as never,
            fakeDatabase(database),
            {} as never,
            {} as never,
            {} as never,
            { getGamesByIds: vi.fn().mockResolvedValue(new Map()) } as never,
            {} as never,
            meets as never,
            { getTranslationsByGameIds: vi.fn().mockResolvedValue(new Map()) } as never,
            meetAccountGames as never,
            {} as never,
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
            createGroupWithMembership: vi.fn().mockResolvedValue({ groupId: 42 }),
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
            getPublicUsersByIds: vi.fn(async (ids: Array<number>) => new Map(ids.map(id => [id, { id, username: `u${id}` }]))),
        }
        const games = {
            getGamesByIds: vi.fn(async (ids: Array<number>) => new Map(ids.map(id => [id, { id, imageUrl: '' }]))),
            getGameById: vi.fn(),
        }
        const translations = {
            getTranslationsByGameIds: vi.fn(async (ids: Array<number>) => new Map(ids.map(id => [id, { en: `Game ${id}`, es: '' }]))),
            getGameTranslations: vi.fn(),
        }
        const database = {
            getActivePlaceholdersByGroupIds: vi
                .fn()
                .mockResolvedValue({ rows: [{ id: 9, groupId: 2, displayName: 'Lucía', avatar: null }] }),
            getAssertedOwnershipByGroupIds: vi.fn().mockResolvedValue({ rows: [{ groupPersonId: 9, gameId: 77 }] }),
        }
        const service = new DashboardService(
            users as never,
            fakeDatabase(database),
            { getGroupById: vi.fn(async (id: number) => ({ id, name: `Group ${id}`, createdBy: 1 })) } as never,
            {
                getGroupMembershipsByAccountId: vi.fn().mockResolvedValue([{ groupId: 1 }, { groupId: 2 }]),
                getGroupMembershipsByGroupId: vi.fn().mockResolvedValue([
                    { accountId: 1, joinedAt: '2026-01-01' },
                    { accountId: 2, joinedAt: '2026-01-02' },
                ]),
            } as never,
            { getGamesOwnedByAccountId: vi.fn(async (id: number) => owned(id)) } as never,
            games as never,
            { getGameReviewsByAccountId: vi.fn().mockResolvedValue([]) } as never,
            {} as never,
            translations as never,
            {} as never,
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
        expect(groups[1]?.placeholders).toEqual([
            {
                id: 9,
                displayName: 'Lucía',
                avatar: null,
                gameIds: [77],
                games: [{ id: 77, imageUrl: '', titleTranslations: { en: 'Game 77', es: '' } }],
            },
        ])
        expect(database.getActivePlaceholdersByGroupIds).toHaveBeenCalledTimes(1)
        expect(translations.getGameTranslations).not.toHaveBeenCalled()
    })
})

describe('DashboardService leaving and removing', () => {
    const createService = (left = true) => {
        const notifier = fakeActivityNotifier()
        const leaveGroup = vi.fn().mockResolvedValue({ left })
        const groups = { getGroupById: vi.fn().mockResolvedValue({ id: 12, name: 'Fridays', createdBy: 1 }) }
        const service = new DashboardService(
            {} as never,
            fakeDatabase({ leaveGroup }),
            groups as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            notifier,
        )

        return { service, notifier, leaveGroup }
    }

    it('tells the group when someone leaves it', async () => {
        const { service, notifier } = createService()

        await expect(service.leaveGroup(7, 12)).resolves.toEqual({ success: true })
        expect(notifier.memberLeft).toHaveBeenCalledWith(12, 7, 7)
    })

    it('tells the group who removed whom', async () => {
        const { service, notifier, leaveGroup } = createService()

        await service.removeMemberFromGroup(1, 12, 7)
        expect(leaveGroup).toHaveBeenCalledWith(7, 12, expect.objectContaining({ type: 'member_removed', actorAccountId: 1 }))
        expect(notifier.memberLeft).toHaveBeenCalledWith(12, 7, 1)
    })

    it('tells nobody when the person was not in the group', async () => {
        const { service, notifier } = createService(false)

        await service.leaveGroup(7, 12)
        await service.removeMemberFromGroup(1, 12, 7)
        expect(notifier.memberLeft).not.toHaveBeenCalled()
    })

    it('tells nobody when the owner tries to leave or to remove themselves', async () => {
        const { service, notifier, leaveGroup } = createService()

        await expect(service.leaveGroup(1, 12)).rejects.toThrow('Owner cannot leave group')
        await expect(service.removeMemberFromGroup(1, 12, 1)).rejects.toThrow('Owner cannot leave group')
        expect(leaveGroup).not.toHaveBeenCalled()
        expect(notifier.memberLeft).not.toHaveBeenCalled()
    })
})
