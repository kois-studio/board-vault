import { TestBed } from '@angular/core/testing'
import { of, Subject } from 'rxjs'
import { Api } from '../../api/api'
import type { GameCompleteType, GroupWithMembersAndGames, UserType } from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
import { AdminGamesManageService } from '../../modules/admin/components/admin-games-manage/admin-games-manage.service'
import { BrowsePageService } from '../../pages/collection-page/browse-page/browse-page.service'
import { GroupViewService } from '../../pages/group-view/group-view.service'
import { DataService } from './data.service'
import { LogService } from './log.service'
import { PendingProposalsService } from './pending-proposals.service'

const user = { id: 1 } as UserType
const game = { id: 10 } as GameCompleteType
const group = { id: 5, name: 'Friday', createdBy: 1, members: [] } as unknown as GroupWithMembersAndGames
const proposalStats = {
    totalProposals: 2,
    approvedProposals: 1,
    rejectedProposals: 0,
    duplicateProposals: 0,
    pendingProposals: 1,
    approvalRate: 50,
    reputationScore: 3,
}

/** Every user load answers with one item, so each piece of state is visibly filled before sign-out. */
function fakeApi(overrides: Record<string, () => unknown> = {}) {
    const answers: Record<string, () => unknown> = {
        getUserGames: () => of([game]),
        getUserGroups: () => of([group]),
        getGroupInvitations: () => of([{ id: 9 }]),
        getUserNotifications: () => of([{ id: 3 }]),
        getUserInvitations: () => of([{ id: 4 }]),
        getUserReviews: () => of([{ gameId: 10 }]),
        getUserMeets: () => of([{ id: 6 }]),
        getUserGamesHistory: () => of([{ meetId: 6 }]),
        getUserWishlist: () => of([game]),
        getUserCollectionActivity: () => of([{ id: 7 }]),
        getUserProposals: () => of([{ id: 8 }]),
        getUserProposalStats: () => of(proposalStats),
        getUserStats: () => of({ totalGamesValue: 120 }),
        getAdminGameProposals: () => of({ proposals: [], pagination: { currentPage: 1, totalPages: 4, totalItems: 4, itemsPerPage: 1 } }),
        ...overrides,
    }
    return Object.fromEntries(Object.entries(answers).map(([name, answer]) => [name, vi.fn(answer)]))
}

function setup(api: ReturnType<typeof fakeApi>) {
    TestBed.configureTestingModule({
        providers: [
            { provide: Api, useValue: api },
            { provide: LogService, useValue: { log: vi.fn(), error: vi.fn() } },
            { provide: ToastService, useValue: { error: vi.fn(), success: vi.fn() } },
        ],
    })
    return {
        data: TestBed.inject(DataService),
        browse: TestBed.inject(BrowsePageService),
        groupView: TestBed.inject(GroupViewService),
        adminGames: TestBed.inject(AdminGamesManageService),
        pendingProposals: TestBed.inject(PendingProposalsService),
    }
}

describe('signing out', () => {
    it('clears every piece of shared user state', async () => {
        const { data, browse, groupView, adminGames, pendingProposals } = setup(fakeApi())

        data.currentUser.set(user)
        TestBed.tick()
        await pendingProposals.refresh()
        browse.browseGamesList.set([game])
        browse.searchControl.setValue('azul')
        browse.currentPage.set(3)
        groupView.groupData.set(group)
        groupView.playerCount.set(4)
        adminGames.gamesList.set([game] as never)
        adminGames.searchControl.setValue('catan')

        expect(data.userGames()).toEqual([game])
        expect(data.invitationsGroupIndex()).toEqual({ 5: [{ id: 9 }] })
        expect(data.userProposalStats()).toEqual(proposalStats)
        expect(pendingProposals.count()).toBe(4)

        data.currentUser.set(null)
        TestBed.tick()

        expect({
            games: data.userGames(),
            groups: data.userGroups(),
            notifications: data.userNotifications(),
            invitations: data.userInvitations(),
            reviews: data.userReviews(),
            meets: data.userMeets(),
            history: data.userHistory(),
            wishlist: data.userWishlist(),
            activity: data.userCollectionActivity(),
            proposals: data.userProposals(),
            groupHistory: data.groupHistoryByGroupId(),
            invitationIndex: data.invitationsGroupIndex(),
        }).toEqual({
            games: [],
            groups: [],
            notifications: [],
            invitations: [],
            reviews: [],
            meets: [],
            history: [],
            wishlist: [],
            activity: [],
            proposals: [],
            groupHistory: {},
            invitationIndex: {},
        })
        expect(data.userProposalStats().totalProposals).toBe(0)
        expect(data.userStats()).toEqual({ totalGamesValue: 0 })
        expect(pendingProposals.count()).toBeNull()
        expect([browse.browseGamesList(), browse.searchControl.value, browse.currentPage()]).toEqual([[], '', 1])
        expect([groupView.groupData(), groupView.playerCount()]).toEqual([null, null])
        expect([adminGames.gamesList(), adminGames.searchControl.value]).toEqual([[], ''])
    })

    it('drops an answer that arrives after sign-out', () => {
        const lateGames = new Subject<Array<GameCompleteType>>()
        const { data } = setup(fakeApi({ getUserGames: () => lateGames }))

        data.currentUser.set(user)
        TestBed.tick()
        data.currentUser.set(null)
        TestBed.tick()
        lateGames.next([game])

        expect(data.userGames()).toEqual([])
    })
})
