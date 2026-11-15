import { DestroyRef, effect, Injectable, inject, signal, untracked } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { catchError, concatMap, firstValueFrom, forkJoin, from, map, type Observable, of, Subject, takeUntil, tap, throwError } from 'rxjs'
import { Api } from '../../api/api'
import type {
    AccountMeetType,
    ClerkSyncResultType,
    CollectionActivityWithGameDataType,
    GameCompleteType,
    GameProposalType,
    GameReviewWithGameData,
    GroupOverviewType,
    GroupShelfType,
    GroupWithShelfType,
    HistoryRecordType,
    HistorySummaryType,
    InvitationWithAccountsData,
    InvitationWithExtraData,
    NotificationType,
    UserProposalStatsType,
    UserStatsType,
    UserType,
} from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
import { type CachedRead, FRESH_FOR_MS, ResourceCache } from '../async/resource-cache'
import { isPending, ResourceSignal, settledValue } from '../async/resource-state'
import { intlLocale } from '../i18n/format'
import { withoutReadRetry } from '../interceptors/resilience.interceptor'
import { withShelf } from '../utils/groupShelf'
import { rsvpToast } from '../utils/rsvp'
import { ConnectivityService } from './connectivity.service'
import { LogService } from './log.service'

/** The lists of the signed-in user that `DataService` keeps, each loaded when a page first shows it (#263). */
export type UserListKey =
    | 'games'
    | 'groups'
    | 'notifications'
    | 'invitations'
    | 'reviews'
    | 'meets'
    | 'history'
    | 'historySummary'
    | 'wishlist'
    | 'collectionActivity'
    | 'proposals'
    | 'proposalStats'
    | 'stats'

const USER_LIST_KEYS: ReadonlyArray<UserListKey> = [
    'games',
    'groups',
    'notifications',
    'invitations',
    'reviews',
    'meets',
    'history',
    'historySummary',
    'wishlist',
    'collectionActivity',
    'proposals',
    'proposalStats',
    'stats',
]

/**
 * What a page or component names in `DataService.use`: the lists it shows, and `groupInvitations` for the pending
 * invitations of the groups you own (`invitationsGroupIndex`), which come with your groups.
 */
export type UserDataKey = UserListKey | 'groupInvitations'

@Injectable({ providedIn: 'root' })
export class DataService {
    private readonly api = inject(Api)
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)
    private readonly connectivity = inject(ConnectivityService)

    // --------------------------------------------------------------------------
    //        signals definition
    // --------------------------------------------------------------------------
    // current user data, null if not logged in
    public readonly currentUser = signal<null | UserType>(null)

    // --------------------------------------------------------------------------
    //         DATA OF THE SIGNED-IN USER
    // --------------------------------------------------------------------------
    // Each piece is a ResourceSignal (#256): `userX` is the data, which changes in place after a write, and
    // `userXState` says whether it is loading, refreshing, failed, or ready. A page renders the state, so an
    // empty list only reads as "nothing here" once it has loaded. A reload never empties what is shown.
    private readonly games = new ResourceSignal<Array<GameCompleteType>>([])
    private readonly groups = new ResourceSignal<Array<GroupOverviewType>>([])
    private readonly notifications = new ResourceSignal<Array<NotificationType>>([])
    private readonly invitations = new ResourceSignal<Array<InvitationWithExtraData>>([])
    private readonly reviews = new ResourceSignal<Array<GameReviewWithGameData>>([])
    private readonly meets = new ResourceSignal<Array<AccountMeetType>>([])
    private readonly history = new ResourceSignal<Array<HistoryRecordType>>([])
    private readonly historySummary = new ResourceSignal<HistorySummaryType | null>(null)
    private readonly wishlist = new ResourceSignal<Array<GameCompleteType>>([])
    private readonly collectionActivity = new ResourceSignal<Array<CollectionActivityWithGameDataType>>([])
    private readonly proposals = new ResourceSignal<Array<GameProposalType>>([])
    private readonly proposalStats = new ResourceSignal<UserProposalStatsType>({
        totalProposals: 0,
        approvedProposals: 0,
        rejectedProposals: 0,
        duplicateProposals: 0,
        pendingProposals: 0,
        approvalRate: 0,
        reputationScore: 0,
    })
    private readonly stats = new ResourceSignal<UserStatsType>({ totalGamesValue: 0 })
    private readonly groupsWithShelves = new ResourceSignal<Array<GroupWithShelfType>>([])
    private readonly resources = [
        this.games,
        this.groups,
        this.notifications,
        this.invitations,
        this.reviews,
        this.meets,
        this.history,
        this.historySummary,
        this.wishlist,
        this.collectionActivity,
        this.proposals,
        this.proposalStats,
        this.stats,
        this.groupsWithShelves,
    ]

    /**
     * Your lists, each loaded the first time an open page names it with `use` instead of all at sign-in, kept
     * while you move around, and read again quietly when a page shows one older than `FRESH_FOR_MS` (#263, ADR-0029).
     */
    private readonly cache = new ResourceCache<UserListKey>(
        {
            games: this.kept(
                this.games,
                (id) => this.api.getUserGames(id),
                (id) => this._getUserGames(id),
                (games, id) => this.applyGames(games, id),
            ),
            groups: this.kept(
                this.groups,
                (id) => this.api.getGroupOverviews(id),
                (id) => this._getUserGroups(id),
                (groups, id) => {
                    // Your groups changed elsewhere: a group you own may be new, so its invitations are read too.
                    this.groupInvitationsStale = true
                    this.applyGroups(groups, id)
                },
            ),
            notifications: this.kept(
                this.notifications,
                (id) => this.api.getUserNotifications(id),
                (id) => this._getUserNotifications(id),
            ),
            invitations: this.kept(
                this.invitations,
                (id) => this.api.getUserInvitations(id),
                (id) => this._getUserInvitations(id),
            ),
            reviews: this.kept(
                this.reviews,
                (id) => this.api.getUserReviews(id),
                (id) => this._getUserReviews(id),
            ),
            meets: this.kept(
                this.meets,
                (id) => this.api.getUserMeets(id),
                (id) => this._getUserMeets(id),
            ),
            history: this.kept(
                this.history,
                (id) => this.firstHistoryPage(id),
                (id) => this._getUserHistory(id),
            ),
            historySummary: this.kept(
                this.historySummary,
                (id) => this.api.getUserHistorySummary(id),
                (id) => this._getUserHistorySummary(id),
            ),
            wishlist: this.kept(
                this.wishlist,
                (id) => this.api.getUserWishlist(id),
                (id) => this._getUserWishlist(id),
            ),
            collectionActivity: this.kept(
                this.collectionActivity,
                (id) => this.api.getUserCollectionActivity(id),
                (id) => this._getUserCollectionActivity(id),
            ),
            proposals: this.kept(
                this.proposals,
                (id) => this.api.getUserProposals(id),
                (id) => this._getUserProposals(id),
            ),
            proposalStats: this.kept(
                this.proposalStats,
                (id) => this.api.getUserProposalStats(id),
                (id) => this._getUserProposalStats(id),
            ),
            stats: this.kept(
                this.stats,
                (id) => this.api.getUserStats(id),
                (id) => this._getUserStats(id),
            ),
        },
        FRESH_FOR_MS,
    )

    /**
     * A page or component shows these until it is destroyed (#263): each list loads the first time something
     * names it, and is read again quietly when it is older than `FRESH_FOR_MS`. Call it from a constructor or a
     * field (it takes the caller's `DestroyRef`), or pass `destroyRef` when calling it later.
     *
     * `groupInvitations` (the pending invitations of the groups you own, `invitationsGroupIndex`) brings your
     * groups with it.
     */
    public use(keys: ReadonlyArray<UserDataKey>, destroyRef: DestroyRef = inject(DestroyRef)): void {
        const lists = keys.filter((key): key is UserListKey => key !== 'groupInvitations')
        const withInvitations = keys.includes('groupInvitations')
        if (withInvitations) {
            // Counted first, so groups that answer at once already read the invitations.
            this.groupInvitationsUsers++
            destroyRef.onDestroy(() => {
                this.groupInvitationsUsers = Math.max(0, this.groupInvitationsUsers - 1)
            })
            if (!lists.includes('groups')) lists.push('groups')
        }
        this.cache.use(lists, destroyRef)
        if (withInvitations) this.ensureGroupInvitations()
    }

    /**
     * Something already using these lists shows them again (the avatar menu opening once more): each is read
     * again quietly if it is no longer fresh, as `use` would.
     */
    public ensure(keys: ReadonlyArray<UserListKey>): void {
        for (const key of keys) this.cache.ensure(key)
    }

    /** A list kept by the cache: `load` shows its loading state and failure toast, `revalidate` reads it quietly. */
    private kept<T>(
        resource: ResourceSignal<T>,
        read: (userId: number) => Observable<T>,
        load: (userId: number) => void,
        apply?: (value: T, userId: number) => void,
    ): CachedRead {
        return {
            resource,
            load: () => {
                const user = untracked(this.currentUser)
                if (user) load(user.id)
            },
            revalidate: () => {
                const user = untracked(this.currentUser)
                if (!user) return
                resource.revalidate(read(user.id).pipe(takeUntil(this.userChanged)), apply && ((value) => apply(value, user.id)))
            },
        }
    }

    public readonly userGames = this.games.value
    public readonly userGamesState = this.games.state
    public readonly userGroups = this.groups.value
    public readonly userGroupsState = this.groups.state
    public readonly userNotifications = this.notifications.value
    public readonly userNotificationsState = this.notifications.state
    public readonly userInvitations = this.invitations.value
    public readonly userInvitationsState = this.invitations.state
    public readonly userReviews = this.reviews.value
    public readonly userReviewsState = this.reviews.state
    public readonly userMeets = this.meets.value
    public readonly userMeetsState = this.meets.state
    /** Your latest nights: the first page of your history (#252). Screens that page further read their own. */
    public readonly userHistory = this.history.value
    public readonly userHistoryState = this.history.state
    /** Totals over your whole history, counted by the server; null until they load. */
    public readonly userHistorySummary = this.historySummary.value
    public readonly userHistorySummaryState = this.historySummary.state
    /** Goes up when your history changes, so screens that page it themselves read it again. */
    public readonly userHistoryRevision = signal(0)
    public readonly userWishlist = this.wishlist.value
    public readonly userWishlistState = this.wishlist.state
    public readonly userCollectionActivity = this.collectionActivity.value
    public readonly userCollectionActivityState = this.collectionActivity.state
    public readonly userProposals = this.proposals.value
    public readonly userProposalsState = this.proposals.state
    public readonly userProposalStats = this.proposalStats.value
    public readonly userProposalStatsState = this.proposalStats.state
    public readonly userStats = this.stats.value
    public readonly userStatsState = this.stats.state
    /**
     * Every group of yours with each person's games and the members' ratings, for the few pages that look across
     * all of them (a game's owners, games to rate). Read only while a page that shows them is open, which asks with
     * `loadUserGroupsWithShelves` (#262), and read again when your groups load or you rate a game meanwhile.
     */
    public readonly userGroupsWithShelves = this.groupsWithShelves.value
    public readonly userGroupsWithShelvesState = this.groupsWithShelves.state
    public readonly groupHistoryByGroupId = signal<Record<number, Array<HistoryRecordType>>>({})

    /**
     * Each group's shelf, asked for the first time a page needs it (#262): your groups list only counts, so it
     * stays small however many games anyone owns. Forgotten when your groups load again (adding or removing a game
     * reloads them, for their counts) or you rate a game, and `groupShelvesRevision` goes up so pages showing one
     * read it again.
     */
    private readonly shelves = new Map<number, Promise<GroupShelfType>>()
    /** The open pages showing `userGroupsWithShelves`: it follows your groups only while there is one. */
    private groupsWithShelvesUsers = 0
    /** The shelves revision `userGroupsWithShelves` was read at, so a page opened later reads it only when stale. */
    private groupsWithShelvesRevision = -1
    public readonly groupShelvesRevision = signal(0)
    /** The open pages showing `invitationsGroupIndex` (`use(['groupInvitations'])`). */
    private groupInvitationsUsers = 0
    /**
     * The invitations of the groups you own are not read for your groups as listed: set when a read of your groups
     * that should bring them starts, so a load replaced by one that only moves the game counts still reads them.
     */
    private groupInvitationsStale = true

    private get groupsWithShelvesWanted(): boolean {
        return this.groupsWithShelvesUsers > 0
    }

    // --------------------------------------------------------------------------
    //         INDEXES (for fast access to data)
    // --------------------------------------------------------------------------
    // (this {groupId} which {Invitation[]} has pending)
    public readonly invitationsGroupIndex = signal<Record<number, Array<InvitationWithAccountsData>>>({})

    // Emits when the signed-in user changes or signs out. Loads started for the previous user stop
    // here, so a late answer cannot put their data back after sign-out.
    private readonly userChanged = new Subject<void>()
    /** Whose lists are held, so a change of person starts from nothing loaded. */
    private loadedUserId: number | null = null

    // --------------------------------------------------------------------------
    // --------------------------------------------------------------------------
    constructor() {
        this.logger.log('DataService initialized.')

        // Effect to react to currentUser changes (login/logout)
        effect(() => {
            const user = this.currentUser()
            // Only the user drives this: a load that fails at once reads other signals (`isDegraded`), and a change
            // of connection must not fetch everything again (#241).
            untracked(() => {
                // Stop the loads on their way first, so ending them is not taken for a failure.
                for (const resource of this.resources) resource.cancel()
                this.userChanged.next()
                this.failedLoads.clear()
                // Another person: nothing of the last one may show, even as "refreshing" (#256). The same person
                // read again (a new username) keeps what is shown while what the open pages show reloads.
                const samePerson = user !== null && user.id === this.loadedUserId
                if (!samePerson) this._clearAllDerivedUserData()
                this.loadedUserId = user?.id ?? null
                if (!user) {
                    this.logger.log('DataService: currentUser is null (logout or initial state). Clearing derived data.')
                    this.cache.stop()
                } else if (samePerson) {
                    this.logger.log(`DataService: currentUser read again (ID: ${user.id}). Reloading what is shown.`)
                    this.invalidateAll()
                } else {
                    // Only what the open pages show loads now; every other list waits for a page that shows it (#263).
                    this.logger.log(`DataService: currentUser updated (ID: ${user.id}). Loading what the open pages show.`)
                    this.cache.start()
                }
            })
        })

        // Try again on the "can't reach Board Vault" banner, or the connection coming back (#241).
        this.connectivity.refreshes.pipe(takeUntilDestroyed()).subscribe(() => this.reloadAfterOutage())
    }

    /**
     * Loads that failed, by name, with how to run them again. A load takes itself off when it starts again, so
     * Try again never reloads what has loaded since; cleared when the user changes.
     */
    private readonly failedLoads = new Map<string, () => void>()

    /**
     * A load failed: `reloadAfterOutage` runs it again. The toast is left out while Board Vault cannot be reached,
     * since the banner already says so and an outage would otherwise stack a dozen of them (#241).
     */
    private loadFailed(name: string, reload: () => void, message: string): void {
        this.failedLoads.set(name, reload)
        if (!this.connectivity.isDegraded()) this.toastService.error(message)
    }

    /**
     * Runs the failed loads again and quietly refreshes what other people change. The refresh always sends a
     * request, so Try again also finds out whether Board Vault answers again.
     */
    private reloadAfterOutage(): void {
        if (!this.currentUser()) return
        const reloads = [...this.failedLoads.values()]
        this.failedLoads.clear()
        for (const reload of reloads) reload()
        this.refreshSharedActivity(true)
    }
    /** The same person read again: what the open pages show reloads, and every other list is read when next shown. */
    private invalidateAll(): void {
        this.groupInvitationsStale = true
        for (const key of USER_LIST_KEYS) this.cache.invalidate(key)
        this.ensureGroupInvitations()
    }

    private _clearAllDerivedUserData(): void {
        for (const resource of this.resources) resource.reset()
        this.shelves.clear()
        this.groupsWithShelvesRevision = -1
        this.groupInvitationsStale = true
        this.groupHistoryByGroupId.set({})
        this.invitationsGroupIndex.set({})
    }

    private _getUserGames(userId: number) {
        this.failedLoads.delete('games')
        this.games.load(this.api.getUserGames(userId).pipe(takeUntil(this.userChanged)), {
            apply: (games) => this.applyGames(games, userId),
            failed: () =>
                this.loadFailed(
                    'games',
                    () => this._getUserGames(userId),
                    $localize`:Toast when My Games could not be loaded:Error retrieving user games`,
                ),
        })
    }

    /** Your games, and your count among each group's members. */
    private applyGames(games: Array<GameCompleteType>, userId: number): void {
        this.userGames.set(games)
        this.userGroups.update((groups) =>
            groups.map((group) => ({
                ...group,
                members: group.members.map((member) => (member.id === userId ? { ...member, gameCount: games.length } : member)),
            })),
        )
    }

    private _getUserInvitations(userId: number) {
        this.failedLoads.delete('invitations')
        this.invitations.load(this.api.getUserInvitations(userId).pipe(takeUntil(this.userChanged)), {
            failed: () =>
                this.loadFailed(
                    'invitations',
                    () => this._getUserInvitations(userId),
                    $localize`:Toast when the inbox could not load group invitations:Error retrieving user’s invitations`,
                ),
        })
    }

    public retryUserInvitations(): void {
        const currentUser = this.currentUser()
        if (currentUser) this._getUserInvitations(currentUser.id)
    }

    private _getUserNotifications(userId: number) {
        this.failedLoads.delete('notifications')
        this.notifications.load(this.api.getUserNotifications(userId).pipe(takeUntil(this.userChanged)), {
            failed: () =>
                this.loadFailed(
                    'notifications',
                    () => this._getUserNotifications(userId),
                    $localize`:Toast when the inbox could not load notifications:Error retrieving user’s notifications`,
                ),
        })
    }

    public retryUserNotifications(): void {
        const currentUser = this.currentUser()
        if (currentUser) this._getUserNotifications(currentUser.id)
    }

    private lastQuietRefresh = 0

    /**
     * Reloads what other people change while the app is open (notifications, invitations, game nights)
     * without loading states or error toasts: the data already shown stays if a read fails.
     * At most once a minute unless `force`.
     */
    public refreshSharedActivity(force = false): void {
        const currentUser = this.currentUser()
        const now = Date.now()
        if (!currentUser || (!force && now - this.lastQuietRefresh < 60_000)) return
        this.lastQuietRefresh = now
        this.refreshInbox()
        // Game nights only while a page shows them; otherwise the next page that does reads them (#263).
        if (this.cache.isUsed('meets'))
            this.quietly(this.api.getUserMeets(currentUser.id, withoutReadRetry()), (meets) => this.meets.set(meets))
        else this.cache.invalidate('meets')
    }

    /**
     * Reloads the inbox (notifications and invitations) quietly, with no limit: opening the inbox and
     * its periodic check call it. What is shown stays if a read fails.
     */
    public refreshInbox(): void {
        const currentUser = this.currentUser()
        if (!currentUser) return
        // A newer look, or a change made meanwhile (read, delete), wins over an answer still on its way.
        this.stopInboxRefresh()
        const stop = this.inboxRefreshStopped
        // A notification kept up to date (a shelf that changed again) moves to a new date: that is news too.
        const notificationKey = (item: NotificationType) => `n${item.id}@${item.createdAt}`
        const known = new Set([...this.userNotifications().map(notificationKey), ...this.userInvitations().map((item) => `i${item.id}`)])
        const arrived = (keys: Array<string>) => {
            const fresh = keys.filter((key) => !known.has(key)).length
            if (fresh > 0) this.inboxArrivals.update((count) => count + 1)
        }
        this.quietly(
            this.api.getUserNotifications(currentUser.id, withoutReadRetry()),
            (notifications) => {
                this.notifications.set(notifications)
                arrived(notifications.filter((item) => !item.isRead).map(notificationKey))
            },
            stop,
        )
        this.quietly(
            this.api.getUserInvitations(currentUser.id, withoutReadRetry()),
            (invitations) => {
                this.invitations.set(invitations)
                arrived(invitations.map((item) => `i${item.id}`))
            },
            stop,
        )
    }

    /**
     * Goes up each time a look at the inbox (`refreshInbox`) brings something it did not have: the inbox
     * tells screen readers. Loading the inbox the first time never counts.
     */
    public readonly inboxArrivals = signal(0)
    private inboxRefreshStopped = new Subject<void>()

    private stopInboxRefresh(): void {
        this.inboxRefreshStopped.next()
        this.inboxRefreshStopped = new Subject<void>()
    }

    /**
     * A read whose failure keeps what is shown; it stops when the user changes, or when `stop` emits.
     * Callers pass `withoutReadRetry()`: the next quiet refresh is the retry (#240).
     */
    private quietly<T>(read: Observable<T>, apply: (value: T) => void, stop?: Observable<void>): void {
        read.pipe(takeUntil(this.userChanged), takeUntil(stop ?? this.userChanged)).subscribe({ next: apply, error: () => undefined })
    }

    private _getUserReviews(accountId: number) {
        this.failedLoads.delete('reviews')
        this.reviews.load(this.api.getUserReviews(accountId).pipe(takeUntil(this.userChanged)), {
            failed: () =>
                this.loadFailed(
                    'reviews',
                    () => this._getUserReviews(accountId),
                    $localize`:Toast when your ratings could not be loaded:Error retrieving user’s reviews`,
                ),
        })
    }

    /**
     * Your groups, and the pending invitations of those you own while a page shows them. `withInvitations: false`
     * is for a change that only moves the game counts (your collection), so it costs one request, not one per group
     * you own (#262). A load replaces one still on its way, so the invitations stay stale until a load that reads
     * them has answered.
     */
    private _getUserGroups(accountId: number, { withInvitations = true } = {}) {
        this.failedLoads.delete('groups')
        if (withInvitations) this.groupInvitationsStale = true
        this.groups.load(this.api.getGroupOverviews(accountId).pipe(takeUntil(this.userChanged)), {
            apply: (groups) => this.applyGroups(groups, accountId),
            failed: (error) => {
                // Groups still listed keep their games on screen; only groups never read take the failure.
                if (this.groupsWithShelvesWanted && settledValue(this.groups.state()) === undefined) {
                    this.groupsWithShelves.load(throwError(() => error))
                }
                this.loadFailed(
                    'groups',
                    () => this._getUserGroups(accountId),
                    $localize`:Toast when your groups could not load:Error retrieving user’s groups`,
                )
            },
        })
    }

    /** Your groups as read: their shelves are read again, and so are the invitations if stale and shown. */
    private applyGroups(groups: Array<GroupOverviewType>, accountId: number): void {
        this.userGroups.set(groups)
        this.forgetGroupShelves(groups)
        if (this.groupInvitationsStale && this.groupInvitationsUsers > 0) this._readGroupInvitations(groups, accountId)
    }

    /** A page shows the invitations of your groups: read them now if your groups are listed and they are stale. */
    private ensureGroupInvitations(): void {
        const user = untracked(this.currentUser)
        if (!user || !this.groupInvitationsStale || this.groupInvitationsUsers === 0) return
        const state = untracked(this.groups.state)
        // A load on its way reads them when it answers.
        if (isPending(state)) return
        const groups = settledValue(state)
        if (groups !== undefined) this._readGroupInvitations(groups, user.id)
    }

    /** The pending invitations of each group you own; groups owned by others have none to show. */
    private _readGroupInvitations(groups: Array<GroupOverviewType>, accountId: number): void {
        this.groupInvitationsStale = false
        for (const group of groups) {
            if (group.createdBy !== accountId) {
                this.invitationsGroupIndex.update((index) => ({ ...index, [group.id]: [] }))
                continue
            }
            this._getGroupInvitations(group)
        }
    }

    /** The pending invitations of a group the user owns. */
    private _getGroupInvitations(group: GroupOverviewType) {
        this.failedLoads.delete(`groupInvitations:${group.id}`)
        this.api
            .getGroupInvitations(group.id)
            .pipe(takeUntil(this.userChanged))
            .subscribe({
                next: (invitations) => {
                    this.invitationsGroupIndex.update((index) => ({
                        ...index,
                        [group.id]: invitations,
                    }))
                },
                error: () => {
                    this.loadFailed(
                        `groupInvitations:${group.id}`,
                        () => this._getGroupInvitations(group),
                        $localize`:Toast when the invitations of a group could not load; the placeholder is the group name:Error retrieving invited members for group: ${group.name}:group:`,
                    )
                },
            })
    }

    private _getUserMeets(userId: number) {
        this.failedLoads.delete('meets')
        this.meets.load(this.api.getUserMeets(userId).pipe(takeUntil(this.userChanged)), {
            failed: () =>
                this.loadFailed(
                    'meets',
                    () => this._getUserMeets(userId),
                    $localize`:Toast when your game nights could not load:Error retrieving user’s meets`,
                ),
        })
    }

    private _getUserHistory(userId: number) {
        this.failedLoads.delete('history')
        this.history.load(this.firstHistoryPage(userId).pipe(takeUntil(this.userChanged)), {
            failed: () =>
                this.loadFailed(
                    'history',
                    () => this._getUserHistory(userId),
                    $localize`:Toast when your game night history could not load:Error retrieving user’s history`,
                ),
        })
    }

    /** Your latest nights: the first page of your history (#252). */
    private firstHistoryPage(userId: number): Observable<Array<HistoryRecordType>> {
        return this.api.getUserGamesHistory(userId).pipe(map((page) => page.entries))
    }

    private _getUserHistorySummary(userId: number) {
        this.failedLoads.delete('historySummary')
        this.historySummary.load(this.api.getUserHistorySummary(userId).pipe(takeUntil(this.userChanged)), {
            failed: () =>
                this.loadFailed(
                    'historySummary',
                    () => this._getUserHistorySummary(userId),
                    $localize`:Toast when the totals of your game nights could not load:Your game night totals could not load`,
                ),
        })
    }

    private _getUserWishlist(userId: number) {
        this.failedLoads.delete('wishlist')
        this.wishlist.load(this.api.getUserWishlist(userId).pipe(takeUntil(this.userChanged)), {
            failed: () =>
                this.loadFailed(
                    'wishlist',
                    () => this._getUserWishlist(userId),
                    $localize`:Toast when your wishlist could not be loaded:Error retrieving user’s wishlist`,
                ),
        })
    }

    private _getUserCollectionActivity(userId: number) {
        this.failedLoads.delete('collectionActivity')
        this.collectionActivity.load(this.api.getUserCollectionActivity(userId).pipe(takeUntil(this.userChanged)), {
            failed: () =>
                this.loadFailed(
                    'collectionActivity',
                    () => this._getUserCollectionActivity(userId),
                    $localize`:Toast when your recent collection activity could not be loaded:Error retrieving user’s collection activity`,
                ),
        })
    }

    private _getUserStats(userId: number) {
        this.failedLoads.delete('stats')
        this.stats.load(this.api.getUserStats(userId).pipe(takeUntil(this.userChanged)), {
            failed: () =>
                this.loadFailed(
                    'stats',
                    () => this._getUserStats(userId),
                    $localize`:Toast when your numbers could not be loaded:Error retrieving user’s stats`,
                ),
        })
    }
    // #region ## public methods ##

    // --------------------------------------------------------------------------
    //   These methods are meant to follow this flow:
    //      1. Update the DB
    //      2. Update the local data (without reloading everything)
    //      3. Give feedback to the user with toasts
    // --------------------------------------------------------------------------

    /**
     * Copies the signed-in user's username and primary email from Clerk to the account now
     * (ADR-0017), then reads the account again if either changed. Null when the copy failed.
     */
    public async syncFromClerk(): Promise<ClerkSyncResultType | null> {
        try {
            const result = await firstValueFrom(this.api.syncFromClerk())
            if (result.username === 'updated' || result.email === 'updated') await this.refreshCurrentUser()
            return result
        } catch {
            return null
        }
    }

    /**
     * Reads the signed-in account again. It replaces `currentUser` only when the username or email
     * differs, because every replacement reloads the user's data. A failed read keeps what is there.
     */
    public async refreshCurrentUser(): Promise<void> {
        const user = this.currentUser()
        if (!user) return

        try {
            const fresh = await firstValueFrom(this.api.getUserById(user.id))
            const current = this.currentUser()
            if (current?.id === fresh.id && (current.username !== fresh.username || current.email !== fresh.email))
                this.currentUser.set(fresh)
        } catch {
            // Nothing changes until the next read.
        }
    }

    // #region form-update-profile

    /**
     * Saves the signed-in account's display name or avatar (#242). Resolves once it is stored, with the account
     * updated everywhere it shows; rejects when it was not, changing nothing, so the caller can say so next to its
     * control instead of in a toast. A save that went through but could not be read back is applied as sent: it is
     * stored, and the next read of the account brings anything the server changed.
     */
    public async updateCurrentUserData(requestBody: { displayName?: string; avatar?: UserType['avatar'] }): Promise<void> {
        const currentUser = this.currentUser()
        if (!currentUser) throw new Error('No authenticated user')

        await firstValueFrom(this.api.updateUser(currentUser.id, requestBody))
        let storedUser: UserType | null
        try {
            storedUser = await firstValueFrom(this.api.getUserById(currentUser.id))
        } catch {
            storedUser = null
        }

        // Signed out, or someone else signed in, while it saved: that account is not the one shown.
        const shownUser = this.currentUser()
        if (shownUser?.id !== currentUser.id) return
        // Saved but not read back: the account as shown now (it may have been re-read meanwhile) with what was sent.
        this.currentUser.set(storedUser ?? { ...shownUser, ...requestBody })
        this.userGroups.update((groups) =>
            groups.map((group) =>
                group.members.some((member) => member.id === currentUser.id)
                    ? {
                          ...group,
                          members: group.members.map((member) => (member.id === currentUser.id ? { ...member, ...requestBody } : member)),
                      }
                    : group,
            ),
        )
        this.toastService.success($localize`:Toast after your profile is saved:User data updated`)
    }

    // #region group-edit
    public removeMemberFromGroup(groupId: number, memberId: number) {
        const currentUser = this.currentUser()
        if (!currentUser) return throwError(() => new Error('No authenticated user'))

        return this.api.removeMember(currentUser.id, groupId, memberId).pipe(
            tap(() => {
                this.userGroups.update((groups) =>
                    groups.map((group) => {
                        return group.id === groupId
                            ? { ...group, members: group.members.filter((member) => member.id !== memberId) }
                            : group
                    }),
                )
                this.toastService.success($localize`:Toast after the group owner removes a member:Member removed from group`)
            }),
            catchError((error) => {
                this.toastService.error($localize`:Toast when a member could not be removed from a group:Error removing member`)
                return throwError(() => error)
            }),
        )
    }

    public removeInvitedFromGroup(invitationId: number) {
        return this.api.deleteInvitation(invitationId).pipe(
            tap(() => {
                this.invitationsGroupIndex.update((index) =>
                    Object.fromEntries(
                        Object.entries(index).map(([groupId, invitations]) => [
                            groupId,
                            invitations.filter((invitation) => invitation.id !== invitationId),
                        ]),
                    ),
                )
                this.toastService.success($localize`:Toast after withdrawing a group invitation:Invitation removed`)
            }),
            catchError((error) => {
                this.toastService.error($localize`:Toast when a group invitation could not be withdrawn:Error removing invitation`)
                return throwError(() => error)
            }),
        )
    }

    public addInvitedToGroup(groupId: number, invitedUsername: string, groupPersonId?: number | null) {
        return this.api.createInvitation(groupId, invitedUsername, groupPersonId).pipe(
            concatMap(() => this.api.getGroupInvitations(groupId)),
            tap((invitations) => {
                this.invitationsGroupIndex.update((index) => ({
                    ...index,
                    [groupId]: invitations,
                }))
                this.toastService.success($localize`:Toast after inviting someone with an account to a group:Invitation sent`)
            }),
            // Failures are explained inline by the page, which keeps what was typed.
        )
    }

    // #region answer a session

    /** Answers a game night from a list (Home, Upcoming) and updates that list in place. */
    public answerSession(sessionId: number, rsvpStatus: 'accepted' | 'declined') {
        return this.api.updateSessionRsvp(sessionId, { rsvpStatus }).pipe(
            tap((result) => {
                this.userMeets.update((meets) =>
                    meets.map((meet) => (meet.id === result.sessionId ? { ...meet, myRsvpStatus: result.rsvpStatus } : meet)),
                )
                this.toastService.success(rsvpToast(result.rsvpStatus))
            }),
        )
    }

    // #region create group

    public createGroup(groupName: string) {
        const currentUser = this.currentUser()
        if (!currentUser) return throwError(() => new Error('No authenticated user'))

        return this.api.createGroup(currentUser.id, groupName).pipe(
            tap(() => {
                this.invalidateGroups()
                this.toastService.success(
                    $localize`:Toast after creating a group; the placeholder is its name:You have created the group ${groupName}:group:`,
                )
            }),
            // Failures are explained inline by the page, which keeps what was typed.
        )
    }

    // #region leave group

    public leaveGroup(groupId: number) {
        const currentUser = this.currentUser()
        if (!currentUser) return throwError(() => new Error('No authenticated user'))

        return this.api.leaveGroup(currentUser.id, groupId).pipe(
            tap(() => {
                // 2.
                this.userGroups.update((groups) => groups.filter((group) => group.id !== groupId))

                // 3.
                this.toastService.success($localize`:Toast after leaving a group:You have left the group`)
            }),
            catchError((error) => {
                if (error.status === 404) {
                    this.toastService.error(
                        $localize`:Toast when leaving a group fails because the group or your account was not found:User or Group not found`,
                    )
                } else if (error.status === 400) {
                    this.toastService.error(
                        $localize`:Toast when the owner of a group tries to leave it:You are the group creator, you cannot leave!`,
                    )
                } else {
                    this.toastService.error($localize`:Toast when leaving a group fails:Error leaving group`)
                }
                return throwError(() => error)
            }),
        )
    }

    // #region delete group

    public deleteGroup(groupId: number) {
        const currentUser = this.currentUser()
        if (!currentUser) return throwError(() => new Error('No authenticated user'))

        return this.api.deleteGroup(currentUser.id, groupId).pipe(
            tap(() => {
                // 2.
                this.userGroups.update((groups) => groups.filter((group) => group.id !== groupId))

                // 3.
                this.toastService.success($localize`:Toast after deleting a group:You have deleted the group`)
            }),
            catchError((error) => {
                if (error.status === 404) {
                    this.toastService.error($localize`:Toast when deleting a group fails because it was not found:Group not found`)
                } else {
                    this.toastService.error($localize`:Toast when deleting a group fails:Error deleting group`)
                }
                return throwError(() => error)
            }),
        )
    }

    // #region invitations

    public acceptInvitation(invitationId: number) {
        const currentUser = this.currentUser()
        if (!currentUser) return throwError(() => new Error('No authenticated user'))

        return this.api.acceptInvitation(currentUser.id, invitationId).pipe(
            tap(() => {
                this.userInvitations.update((invitations) => invitations.filter((invitation) => invitation.id !== invitationId))
                this.invalidateGroups()
                this.toastService.success($localize`:Toast after accepting a group invitation:You have joined the group!`)
            }),
            catchError((error) => {
                this.toastService.error($localize`:Toast when accepting a group invitation failed:Error accepting invitation`)
                return throwError(() => error)
            }),
        )
    }

    public rejectInvitation(invitationId: number) {
        return this.api.rejectInvitation(invitationId).pipe(
            tap(() => {
                this.userInvitations.update((invitations) => invitations.filter((invitation) => invitation.id !== invitationId))
                this.toastService.success($localize`:Toast after declining a group invitation:Invitation declined`)
            }),
            catchError((error) => {
                this.toastService.error($localize`:Toast when declining a group invitation failed:Error declining invitation`)
                return throwError(() => error)
            }),
        )
    }

    // #region notifications

    public deleteNotification(notificationId: number) {
        this.stopInboxRefresh()
        // 1.
        this.api.deleteNotification(notificationId).subscribe({
            next: () => {
                // 2.
                this.userNotifications.update((notifications) => notifications.filter((notification) => notification.id !== notificationId))

                // 3.
                this.toastService.success($localize`:Toast after deleting a notification:You have deleted the notification`)
            },
            error: (error) => {
                if (error.status === 404) {
                    return this.toastService.error(
                        $localize`:Toast when a notification was already deleted elsewhere:Notification not found`,
                    )
                }
                this.toastService.error($localize`:Toast when deleting a notification failed:Error deleting notification`)
            },
        })
    }

    /** Marks a notification read; `announce: false` skips the toast, for a read that comes with another action. */
    public updateNotification(notificationId: number, { announce = true }: { announce?: boolean } = {}) {
        this.stopInboxRefresh()
        this.api.updateNotification(notificationId, { isRead: true }).subscribe({
            next: () => {
                this.userNotifications.update((notifications) =>
                    notifications.map((notification) =>
                        notification.id === notificationId ? { ...notification, isRead: true } : notification,
                    ),
                )

                if (announce) this.toastService.success($localize`:Toast after marking a notification as read:Notification marked as read`)
            },
            error: (error) => {
                if (error.status === 404) {
                    return this.toastService.error(
                        $localize`:Toast when a notification was already deleted elsewhere:Notification not found`,
                    )
                }
                this.toastService.error($localize`:Toast when marking a notification as read failed:Error updating notification`)
            },
        })
    }

    public markAllNotificationsRead() {
        const unread = this.userNotifications().filter((notification) => !notification.isRead)
        if (unread.length === 0) return
        this.stopInboxRefresh()

        // Each one on its own: one that fails, or was deleted elsewhere (404), doesn't undo the others.
        const outcomes = unread.map((notification) =>
            this.api.updateNotification(notification.id, { isRead: true }).pipe(
                map(() => 'read' as const),
                catchError((error: { status?: number }) => of(error?.status === 404 ? ('gone' as const) : ('failed' as const))),
            ),
        )
        forkJoin(outcomes).subscribe((results) => {
            const read = new Set(unread.filter((_, index) => results[index] === 'read').map((notification) => notification.id))
            const gone = new Set(unread.filter((_, index) => results[index] === 'gone').map((notification) => notification.id))
            const failed = results.filter((result) => result === 'failed').length
            this.userNotifications.update((notifications) =>
                notifications
                    .filter((notification) => !gone.has(notification.id))
                    .map((notification) => (read.has(notification.id) ? { ...notification, isRead: true } : notification)),
            )
            if (failed === 0) this.toastService.success($localize`:Toast after Mark all read in the inbox:All notifications marked as read`)
            else
                this.toastService.error(
                    new Intl.PluralRules(intlLocale()).select(failed) === 'one'
                        ? $localize`:mark all read failed, one|Toast after Mark all read in the inbox when some failed, one:${failed}:count: notification could not be marked as read`
                        : $localize`:mark all read failed, other|Toast after Mark all read in the inbox when some failed, more than one:${failed}:count: notifications could not be marked as read`,
                )
        })
    }

    // #region Game Reviews

    public saveGameReview(accountId: number, gameId: number, review: number) {
        // 1.
        this.api.saveGameReview(accountId, gameId, review).subscribe({
            next: () => {
                // Reload without clearing first, so the reviews list doesn't flash empty.
                this.cache.invalidate('reviews')
                this.cache.invalidate('collectionActivity')
                // The shelves hold the members' ratings (#262).
                this.forgetGroupShelves()

                this.toastService.success($localize`:Toast after rating a game:Review saved`)
            },
            error: () => {
                this.toastService.error($localize`:Toast when rating a game failed:Error saving review`)
            },
        })
    }

    // The refreshes below follow a write or a Retry: a list an open page shows reloads now, as before (#256),
    // and any other is read again by the next page that shows it (#263).

    public refreshGameReviews() {
        this.cache.invalidate('reviews')
    }

    public refreshUserWishlist() {
        this.cache.invalidate('wishlist')
    }

    /**
     * Adds the game to the wishlist or takes it off, then updates `userWishlist`
     * in place (no reload, so lists don't flash) and the activity list.
     * Resolves to whether the game is now on the wishlist.
     */
    public async toggleWishlist(game: GameCompleteType): Promise<boolean> {
        const currentUser = this.currentUser()
        if (!currentUser) throw new Error('No signed-in user')

        const { isWishlisted } = await firstValueFrom(this.api.toggleWishlist(currentUser.id, game.id))
        this.userWishlist.update((wishlist) => {
            const others = wishlist.filter((item) => item.id !== game.id)
            return isWishlisted ? [...others, game] : others
        })
        this.cache.invalidate('collectionActivity')
        return isWishlisted
    }

    /** Reloads My Games and, since every collection change is logged, the activity list. */
    public refreshUserGames() {
        this.cache.invalidate('games')
        this.cache.invalidate('collectionActivity')
        // The groups count your games once each among everyone's, which only the server knows (#262).
        this.invalidateGroups({ withInvitations: false })
    }

    public refreshUserCollectionActivity(): void {
        this.cache.invalidate('collectionActivity')
    }

    public refreshUserGroups() {
        this.invalidateGroups()
    }

    /**
     * Your groups changed. `withInvitations: false` is for a change that only moves the game counts: the
     * invitations of the groups you own are not read again for it (#262).
     */
    private invalidateGroups({ withInvitations = true } = {}): void {
        const currentUser = untracked(this.currentUser)
        if (!currentUser) return
        if (withInvitations) this.groupInvitationsStale = true
        this.cache.invalidate('groups', () => this._getUserGroups(currentUser.id, { withInvitations }))
    }

    /**
     * One of your groups' games once each, who owns them, and the members' ratings (#262), read once and kept
     * until your groups or games load again; `fresh` reads it again. A failed read is not kept.
     */
    public groupShelf(groupId: number, fresh = false): Promise<GroupShelfType> {
        const currentUser = this.currentUser()
        if (!currentUser) return Promise.reject(new Error('No authenticated user'))
        const kept = fresh ? undefined : this.shelves.get(groupId)
        if (kept) return kept

        const shelf = firstValueFrom(this.api.getGroupShelf(currentUser.id, groupId).pipe(takeUntil(this.userChanged)))
        this.shelves.set(groupId, shelf)
        shelf.catch(() => {
            if (this.shelves.get(groupId) === shelf) this.shelves.delete(groupId)
        })
        return shelf
    }

    /**
     * One of your groups with each person's games and the members' ratings, for a page about that group: the
     * group already listed when your groups have loaded, or else that group alone, rather than waiting for all of
     * them (#258), with its shelf (#262).
     */
    public async groupWithShelf(groupId: number, fresh = false): Promise<GroupWithShelfType> {
        const currentUser = this.currentUser()
        if (!currentUser) throw new Error('No authenticated user')
        const listed = fresh ? undefined : settledValue(this.userGroupsState())?.find((group) => group.id === groupId)
        const [group, shelf] = await Promise.all([
            listed ?? firstValueFrom(this.api.getGroupOverview(currentUser.id, groupId)),
            this.groupShelf(groupId, fresh),
        ])
        return withShelf(group, shelf)
    }

    /**
     * For a page showing `userGroupsWithShelves`: reads it once your groups have loaded, unless it is up to date, and
     * keeps it following your groups until the page is destroyed.
     */
    public loadUserGroupsWithShelves(destroyRef: DestroyRef): void {
        this.groupsWithShelvesUsers++
        destroyRef.onDestroy(() => {
            this.groupsWithShelvesUsers = Math.max(0, this.groupsWithShelvesUsers - 1)
        })
        // They are built from your groups: a page showing them shows those too (#263). Groups that load now read
        // the shelves when they answer.
        this.use(['groups'], destroyRef)
        const groups = untracked(this.groups.state)
        const listed = settledValue(groups)
        if (listed !== undefined) {
            const current =
                this.groupsWithShelvesRevision === untracked(this.groupShelvesRevision) &&
                (this.groupsWithShelves.busy || untracked(this.groupsWithShelves.state).status === 'ready')
            if (!current) this._getGroupsWithShelves()
        } else if (groups.status === 'error') {
            this.groupsWithShelves.load(throwError(() => groups.error))
        }
    }

    /** Every group with its shelf: `groups` as they arrive, or else (Retry too) as listed when it runs. */
    private _getGroupsWithShelves(groups = settledValue(this.groups.state()) ?? []): void {
        this.failedLoads.delete('groupsWithShelves')
        this.groupsWithShelvesRevision = this.groupShelvesRevision()
        const all = Promise.all(groups.map(async (group) => withShelf(group, await this.groupShelf(group.id))))
        this.groupsWithShelves.load(from(all).pipe(takeUntil(this.userChanged)), {
            failed: () => {
                this.groupsWithShelvesRevision = -1
                this.loadFailed(
                    'groupsWithShelves',
                    () => this._getGroupsWithShelves(),
                    $localize`:Toast when the games of your groups could not load:Error retrieving your groups’ games`,
                )
            },
        })
    }

    /** Your groups or ratings have changed: shelves are read again, and the pages showing them follow. */
    private forgetGroupShelves(groups?: Array<GroupOverviewType>): void {
        this.shelves.clear()
        this.groupShelvesRevision.update((revision) => revision + 1)
        if (this.groupsWithShelvesWanted) this._getGroupsWithShelves(groups)
    }

    public refreshUserStats() {
        this.cache.invalidate('stats')
    }

    // #region Meetings

    public refreshUserMeets() {
        this.cache.invalidate('meets')
    }

    public refreshUserHistory() {
        if (!this.currentUser()) return

        this.userHistoryRevision.update((revision) => revision + 1)
        this.cache.invalidate('history')
        this.cache.invalidate('historySummary')
    }

    public updateSessionAttendees(meetId: number, attendeeIds: Array<number>) {
        return this.api.updateSessionAttendees(meetId, { attendeeIds }).pipe(
            catchError((error) => {
                this.toastService.error(
                    error.status === 400
                        ? $localize`:Toast when a game night would be left with nobody from the group:A session must have at least one group member`
                        : $localize`:Toast when the change to who came to a game night could not be saved:Could not save the attendee changes`,
                )
                return throwError(() => error)
            }),
        )
    }

    private _getUserProposals(userId: number) {
        this.failedLoads.delete('proposals')
        this.proposals.load(this.api.getUserProposals(userId).pipe(takeUntil(this.userChanged)), {
            failed: () =>
                this.loadFailed(
                    'proposals',
                    () => this._getUserProposals(userId),
                    $localize`:Toast when your game proposals could not be loaded:Error retrieving user’s proposals`,
                ),
        })
    }

    private _getUserProposalStats(userId: number) {
        this.failedLoads.delete('proposalStats')
        this.proposalStats.load(this.api.getUserProposalStats(userId).pipe(takeUntil(this.userChanged)), {
            failed: () =>
                this.loadFailed(
                    'proposalStats',
                    () => this._getUserProposalStats(userId),
                    $localize`:Toast when the numbers about your game proposals could not be loaded:Error retrieving user’s proposal stats`,
                ),
        })
    }

    public refreshUserProposals(): void {
        this.cache.invalidate('proposals')
    }

    public refreshUserProposalStats(): void {
        this.cache.invalidate('proposalStats')
    }
}
