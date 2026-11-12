import { NotFoundException } from '@nestjs/common'

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
            getGroupPeopleByGroupIds: vi.fn().mockResolvedValue({ rows: [] }),
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
            { withTitles: vi.fn(async (games: Array<unknown>) => games) } as never,
            meetAccountGames as never,
            {} as never,
        )

        await expect(service.getGroupMeetings(1, 7, 'es')).resolves.toHaveLength(1)
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
        )

        await expect(service.createGroup(7, 'Friday Crew')).resolves.toEqual({ success: true, groupId: 42 })
        expect(database.createGroupWithMembership).toHaveBeenCalledWith({ name: 'Friday Crew', createdBy: 7 })
    })
})

// Groups 1 and 2 both have Ada (1) and Bea (2); group 2 also has Lucía (9), a person without an account.
// Each member owns three games (Ada 11–13, Bea 21–23); Lucía brings game 77, which Bea also rates.
const createGroupsService = () => {
    const owned = (accountId: number) => [1, 2, 3].map(n => ({ accountId, gameId: accountId * 10 + n }))
    const users = {
        getPublicUsersByIds: vi.fn(async (ids: Array<number>) => new Map(ids.map(id => [id, { id, username: `u${id}` }]))),
    }
    const groups = {
        getGroupsByIds: vi.fn(async (ids: Array<number>) => new Map(ids.map(id => [id, { id, name: `Group ${id}`, createdBy: 1 }]))),
        getGroupById: vi.fn(),
    }
    const memberships = {
        getGroupMembershipsByAccountId: vi.fn().mockResolvedValue([{ groupId: 1 }, { groupId: 2 }]),
        getGroupMembershipsByGroupIds: vi.fn(async (ids: Array<number>) =>
            ids.flatMap(groupId => [
                { accountId: 1, groupId, joinedAt: '2026-01-01' },
                { accountId: 2, groupId, joinedAt: '2026-01-02' },
            ]),
        ),
        getGroupMembershipsByGroupId: vi.fn(),
    }
    const gamesOwned = {
        getGamesOwnedByAccountIds: vi.fn(async (ids: Array<number>) => ids.flatMap(id => owned(id))),
        getGamesOwnedByAccountId: vi.fn(),
    }
    const games = {
        getGamesByIds: vi.fn(async (ids: Array<number>) => new Map(ids.map(id => [id, { id, imageUrl: '' }]))),
        getGameById: vi.fn(),
    }
    const reviews = {
        getGameReviewsByAccountIds: vi.fn().mockResolvedValue([
            { accountId: 2, gameId: 77, review: 8, reviewDate: '2026-02-01' },
            { accountId: 1, gameId: 11, review: 6, reviewDate: '2026-02-02' },
        ]),
        getGameReviewsByAccountId: vi.fn(),
    }
    const translations = {
        withTitles: vi.fn(async (games: Array<{ id: number }>) =>
            games.map(game => ({
                ...game,
                title: `Game ${game.id}`,
                titleLanguage: 'es',
                titleTranslations: { es: `Game ${game.id}` },
            })),
        ),
        getGameTranslations: vi.fn(),
    }
    const database = {
        getActivePlaceholdersByGroupIds: vi.fn().mockResolvedValue({ rows: [{ id: 9, groupId: 2, displayName: 'Lucía', avatar: null }] }),
        getAssertedOwnershipByGroupIds: vi.fn().mockResolvedValue({ rows: [{ groupPersonId: 9, gameId: 77 }] }),
    }
    const service = new DashboardService(
        users as never,
        fakeDatabase(database),
        groups as never,
        memberships as never,
        gamesOwned as never,
        games as never,
        reviews as never,
        {} as never,
        translations as never,
        {} as never,
        {} as never,
    )
    // Every lookup the group endpoints may make; each must run once per request, never once per group or person.
    const lookups = [
        users.getPublicUsersByIds,
        groups.getGroupsByIds,
        memberships.getGroupMembershipsByGroupIds,
        gamesOwned.getGamesOwnedByAccountIds,
        database.getActivePlaceholdersByGroupIds,
        database.getAssertedOwnershipByGroupIds,
    ]
    const perItem = [
        groups.getGroupById,
        memberships.getGroupMembershipsByGroupId,
        gamesOwned.getGamesOwnedByAccountId,
        reviews.getGameReviewsByAccountId,
        games.getGameById,
        translations.getGameTranslations,
    ]

    return { service, groups, memberships, games, reviews, translations, database, lookups, perItem }
}

describe('DashboardService groups with every game (deprecated, #262)', () => {
    it('loads groups, members, games, reviews, and titles once, however many groups and games there are', async () => {
        const { service, games, reviews, translations, database, lookups, perItem } = createGroupsService()

        const groups = await service.getGroupsOfUser(1, 'es')

        expect(groups).toHaveLength(2)
        expect(groups[0]?.members[1]?.games.map(game => game.title)).toEqual(['Game 21', 'Game 22', 'Game 23'])
        expect(groups[0]?.members[1]?.reviews).toEqual([{ accountId: 2, gameId: 77, review: 8, reviewDate: '2026-02-01' }])
        expect(groups[0]?.placeholders).toEqual([])
        expect(groups[1]?.placeholders).toEqual([
            {
                id: 9,
                displayName: 'Lucía',
                avatar: null,
                gameIds: [77],
                games: [{ id: 77, imageUrl: '', title: 'Game 77', titleLanguage: 'es', titleTranslations: { es: 'Game 77' } }],
            },
        ])
        for (const lookup of [...lookups, games.getGamesByIds, reviews.getGameReviewsByAccountIds, translations.withTitles]) {
            expect(lookup).toHaveBeenCalledTimes(1)
        }
        for (const lookup of perItem) expect(lookup).not.toHaveBeenCalled()
        expect(database.getActivePlaceholdersByGroupIds).toHaveBeenCalledWith([1, 2])
    })

    it('answers one group as in the list of all groups, and reads only that group (#258)', async () => {
        const { service, memberships, database } = createGroupsService()

        const group = await service.getGroupOfUser(2, 'es')

        expect(group.id).toBe(2)
        expect(group.name).toBe('Group 2')
        expect(group.members.map(member => member.id)).toEqual([1, 2])
        expect(group.members[0]?.games.map(game => game.title)).toEqual(['Game 11', 'Game 12', 'Game 13'])
        expect(group.members[0]?.reviews.map(review => review.gameId)).toEqual([11])
        expect(group.placeholders.map(person => person.displayName)).toEqual(['Lucía'])
        // Only that group is read, never the caller's other groups.
        expect(memberships.getGroupMembershipsByAccountId).not.toHaveBeenCalled()
        expect(memberships.getGroupMembershipsByGroupIds).toHaveBeenCalledWith([2])
        expect(database.getActivePlaceholdersByGroupIds).toHaveBeenCalledWith([2])
    })

    it('says a group that no longer exists is not found, in every shape', async () => {
        const { service, groups } = createGroupsService()

        groups.getGroupsByIds.mockResolvedValue(new Map())

        await expect(service.getGroupOfUser(2, 'es')).rejects.toThrow(NotFoundException)
        await expect(service.getGroupOverviewOfUser(2)).rejects.toThrow(NotFoundException)
        await expect(service.getGroupShelf(2, 'es')).rejects.toThrow(NotFoundException)
    })
})

describe('DashboardService group overviews (#262)', () => {
    it('counts games instead of sending them, in a fixed number of lookups', async () => {
        const { service, games, reviews, translations, lookups, perItem } = createGroupsService()

        const groups = await service.getGroupOverviewsOfUser(1)

        expect(groups).toEqual([
            {
                id: 1,
                name: 'Group 1',
                createdBy: 1,
                gameCount: 6,
                members: [
                    { id: 1, username: 'u1', joinedAt: '2026-01-01', gameCount: 3 },
                    { id: 2, username: 'u2', joinedAt: '2026-01-02', gameCount: 3 },
                ],
                placeholders: [],
            },
            {
                id: 2,
                name: 'Group 2',
                createdBy: 1,
                gameCount: 7,
                members: [
                    { id: 1, username: 'u1', joinedAt: '2026-01-01', gameCount: 3 },
                    { id: 2, username: 'u2', joinedAt: '2026-01-02', gameCount: 3 },
                ],
                placeholders: [{ id: 9, displayName: 'Lucía', avatar: null, gameCount: 1 }],
            },
        ])
        for (const lookup of lookups) expect(lookup).toHaveBeenCalledTimes(1)
        // No game, title or review is read at all.
        for (const lookup of [...perItem, games.getGamesByIds, reviews.getGameReviewsByAccountIds, translations.withTitles]) {
            expect(lookup).not.toHaveBeenCalled()
        }
    })

    it('counts a game two people own once for the group', async () => {
        const { service, database } = createGroupsService()

        database.getAssertedOwnershipByGroupIds.mockResolvedValue({ rows: [{ groupPersonId: 9, gameId: 11 }] })

        const group = await service.getGroupOverviewOfUser(2)

        expect(group.gameCount).toBe(6)
        expect(group.placeholders[0]?.gameCount).toBe(1)
    })
})

describe('DashboardService group shelf (#262)', () => {
    it("answers the group's games once each, by title, who owns them, and the members' ratings", async () => {
        const { service, games, reviews, translations, lookups, perItem, memberships } = createGroupsService()

        const shelf = await service.getGroupShelf(2, 'es')

        expect(shelf.games.map(game => game.id)).toEqual([11, 12, 13, 21, 22, 23, 77])
        expect(shelf.owners).toEqual([
            { accountId: 1, groupPersonId: null, gameIds: [11, 12, 13] },
            { accountId: 2, groupPersonId: null, gameIds: [21, 22, 23] },
            { accountId: null, groupPersonId: 9, gameIds: [77] },
        ])
        expect(shelf.reviews.map(review => [review.accountId, review.gameId])).toEqual([
            [2, 77],
            [1, 11],
        ])
        expect(reviews.getGameReviewsByAccountIds).toHaveBeenCalledWith([1, 2])
        expect(memberships.getGroupMembershipsByGroupIds).toHaveBeenCalledWith([2])
        for (const lookup of [...lookups, games.getGamesByIds, translations.withTitles]) expect(lookup).toHaveBeenCalledTimes(1)
        for (const lookup of perItem) expect(lookup).not.toHaveBeenCalled()
    })

    it('reads no games when nobody owns any', async () => {
        const { service, games, memberships, database } = createGroupsService()

        memberships.getGroupMembershipsByGroupIds.mockResolvedValue([])
        database.getAssertedOwnershipByGroupIds.mockResolvedValue({ rows: [] })

        const shelf = await service.getGroupShelf(2, 'es')

        expect(shelf.games).toEqual([])
        expect(shelf.owners).toEqual([{ accountId: null, groupPersonId: 9, gameIds: [] }])
        expect(games.getGamesByIds).not.toHaveBeenCalled()
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
