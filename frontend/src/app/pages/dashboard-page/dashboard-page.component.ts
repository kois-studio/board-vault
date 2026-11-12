import { NgTemplateOutlet } from '@angular/common'
import { Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { AccountMeetType, GameCompleteType, GroupOverviewType, HistoryRecordType } from '../../api/api.types'
import { CardGroupComponent, type GroupActivity } from '../../components/card-group/card-group.component'
import { CardInvitationComponent } from '../../components/card-invitation/card-invitation.component'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { NextNightCardComponent } from '../../components/next-night-card/next-night-card.component'
import { RatingFollowUpComponent } from '../../components/rating-follow-up/rating-follow-up.component'
import { SessionAnswerComponent } from '../../components/session-answer/session-answer.component'
import { SkeletonCardGroupComponent } from '../../components/skeletons/skeleton-card-group/skeleton-card-group.component'
import { ASYNC } from '../../components/ui/async/async.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { isFirstLoad, settledValue } from '../../core/async/resource-state'
import { DataService } from '../../core/services/data.service'
import { HomePreferencesService } from '../../core/services/home-preferences.service'
import { gameTitle } from '../../core/utils/gameTitle'
import { mergeHistoryParticipants } from '../../core/utils/historyParticipants'
import { daysUntil, relativeDay, sessionDate, upcomingState } from '../../core/utils/sessionTiming'

/**
 * Home: the signed-in starting point. It follows where the person is: a new account is pointed at its
 * first group; after that the next game night leads, then the groups (one large card each, stacked
 * when there are several), then what was played lately. Groups live here; there is no separate groups page.
 */
@Component({
    imports: [
        ASYNC,
        RatingFollowUpComponent,
        ButtonComponent,
        CardGroupComponent,
        CardInvitationComponent,
        ContainerWrapperComponent,
        IconComponent,
        ImageProfileComponent,
        NextNightCardComponent,
        NgTemplateOutlet,
        RouterLink,
        SessionAnswerComponent,
        SkeletonCardGroupComponent,
    ],
    templateUrl: 'dashboard-page.component.html',
})
export class DashboardPageComponent {
    readonly home = inject(HomePreferencesService)
    private readonly dataService = inject(DataService)

    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGroups$ = this.dataService.userGroups
    public readonly userGroupsError = computed(() => this.dataService.userGroupsState().status === 'error')
    public readonly userMeetsError = computed(() => this.dataService.userMeetsState().status === 'error')
    public readonly userInvitations$ = this.dataService.userInvitations
    public readonly userInvitationsError = computed(() => this.dataService.userInvitationsState().status === 'error')
    public readonly invitationsGroupIndex$ = this.dataService.invitationsGroupIndex

    /**
     * Home waits for your groups, invitations and game nights the first time (#261): they load together, and each one
     * adds or moves a block (the invitations strip, the next night, the buttons), so the page shows once, where it stays.
     * A refresh keeps the page; a failure shows the page with that part's error.
     */
    public readonly isLoadingHome = computed(
        () =>
            isFirstLoad(this.dataService.userGroupsState()) ||
            isFirstLoad(this.dataService.userInvitationsState()) ||
            isFirstLoad(this.dataService.userMeetsState()),
    )
    /** Your latest nights, as one state: "Nothing recorded yet" only once they have loaded (#256). */
    public readonly historyState = this.dataService.userHistoryState

    public readonly greetingName = computed(() => {
        const user = this.currentUser$()
        return user?.displayName || user?.username || ''
    })

    /** No group yet, and nothing failed or still loading: the page is about making the first one. */
    public readonly isNew = computed(() => !this.isLoadingHome() && !this.userGroupsError() && this.userGroups$().length === 0)
    public readonly hasGames = computed(() => this.dataService.userGames().length > 0)
    /**
     * How many of the three first steps are done; null until your games have loaded, so it never reads
     * "0 of 3" while they load or after they failed (#256).
     */
    public readonly setupStepsDone = computed(() => {
        const games = settledValue(this.dataService.userGamesState())
        return games === undefined ? null : games.length > 0 ? 1 : 0
    })
    /** Your shelf has loaded and it is empty: only then does Home suggest adding games. */
    public readonly shelfEmpty = computed(() => settledValue(this.dataService.userGamesState())?.length === 0)

    private readonly groupsById = computed(() => new Map(this.userGroups$().map((group) => [group.id, group])))

    public groupName(groupId: number): string {
        return this.groupsById().get(groupId)?.name ?? $localize`:Name used on Home for a group that is no longer in your list:Your group`
    }

    /** The next night's group's shelf (#262): read only for that group, once Home knows its next night. */
    private readonly nextNightShelf = signal<{ groupId: number; games: Map<number, GameCompleteType> } | null>(null)

    /** Every game in the next night's group, members' and people's without an account, to show its shortlist. */
    public readonly nextNightGames = computed(() => {
        const shelf = this.nextNightShelf()
        return shelf && shelf.groupId === this.nextNight()?.groupId ? shelf.games : new Map<number, GameCompleteType>()
    })

    constructor() {
        effect(() => {
            const groupId = this.nextNight()?.groupId
            // Your groups or games loaded again: read it again.
            this.dataService.groupShelvesRevision()
            // Only once your groups are listed, so the shelf is read with them, not before and again after.
            const listed = settledValue(this.dataService.userGroupsState())?.some((group) => group.id === groupId)
            if (groupId === undefined || !listed) return
            untracked(() => {
                this.dataService
                    .groupShelf(groupId)
                    .then((shelf) => {
                        if (this.nextNight()?.groupId === groupId) {
                            this.nextNightShelf.set({ groupId, games: new Map(shelf.games.map((game) => [game.id, game])) })
                        }
                    })
                    // The card shows the night without its shortlist's names, as when the group is unknown.
                    .catch(() => undefined)
            })
        })
    }

    /** "Azul, Wingspan" for the games you said you'd bring; they are on your own shelf. */
    public gamesToBringLabel(meet: AccountMeetType): string {
        const shelf = new Map(this.dataService.userGames().map((game) => [game.id, gameTitle(game)]))
        const aGame = $localize`:On Home, the name used for a game you said you would bring that is no longer on your shelf:a game`
        return meet.gamesToBring.map((gameId) => shelf.get(gameId) ?? aGame).join(', ')
    }

    /** Running or planned game nights across every group, soonest first (the same rule as Play and Upcoming). */
    public readonly upcomingSessions = computed(() =>
        this.dataService
            .userMeets()
            .filter((meet) => {
                const state = upcomingState(meet)
                return state === 'live' || state === 'planned'
            })
            .sort((a, b) => new Date(a.meetDate).getTime() - new Date(b.meetDate).getTime()),
    )
    /** The night the page leads with, then two more as short rows. */
    public readonly nextNight = computed(() => this.upcomingSessions()[0] ?? null)
    public readonly laterNights = computed(() => this.upcomingSessions().slice(1, 3))

    /** "Sat 24 Oct · 19:30" in the night's own timezone. */
    public shortDate(meet: AccountMeetType): string {
        const day = sessionDate(meet, { weekday: 'short', day: 'numeric', month: 'short' })
        return `${day} · ${sessionDate(meet, { hour: '2-digit', minute: '2-digit', hour12: false })}`
    }

    /** Per group: a night under way, the next planned one, or the last one played. */
    public readonly groupActivity = computed(() => {
        const activity = new Map<number, GroupActivity>()
        for (const group of this.userGroups$())
            activity.set(group.id, {
                tone: 'none',
                label: $localize`:Chip on a group in the list on Home, before it has had a game night:No nights yet`,
                time: 0,
            })

        // Soonest first, so the first planned night a group meets is its next one.
        for (const meet of this.upcomingSessions()) {
            const current = activity.get(meet.groupId)
            if (!current || current.tone === 'live' || current.tone === 'next') continue
            const time = new Date(meet.meetDate).getTime()
            if (upcomingState(meet) === 'live')
                activity.set(meet.groupId, {
                    tone: 'live',
                    label: $localize`:Chip on a group in the list on Home while its game night is under way:Happening now`,
                    time,
                })
            else {
                // "Today" and "Tomorrow" say it best; any later night shows its date.
                const days = daysUntil(meet.meetDate)
                const label = days === 0 || days === 1 ? relativeDay(meet.meetDate) : sessionDate(meet, { day: 'numeric', month: 'short' })
                activity.set(meet.groupId, { tone: 'next', label, time })
            }
        }
        for (const meet of this.dataService.userMeets()) {
            const current = activity.get(meet.groupId)
            if (meet.status !== 'completed' || !current || current.tone === 'live' || current.tone === 'next') continue
            const time = new Date(meet.meetDate).getTime()
            if (current.tone === 'past' && current.time >= time) continue
            const date = sessionDate(meet, { day: 'numeric', month: 'short' })
            activity.set(meet.groupId, {
                tone: 'past',
                label: $localize`:Chip on a group in the list on Home, the date of its last game night such as 24 Oct:Last: ${date}:date:`,
                time,
            })
        }
        return activity
    })

    /**
     * Your pinned groups first, in the order you pinned them; then a night under way, the soonest
     * planned, and the most recently played. Pins are personal and follow the account (ADR-0022).
     */
    public readonly orderedGroups = computed(() => {
        const pins = this.home.preferences().pinnedGroupIds
        const rank = { live: 0, next: 1, past: 2, none: 3 }
        const activity = this.groupActivity()
        const of = (group: GroupOverviewType) => activity.get(group.id) ?? { tone: 'none' as const, label: '', time: 0 }
        const pinOrder = (group: GroupOverviewType) => (pins.includes(group.id) ? pins.indexOf(group.id) : Infinity)
        return [...this.userGroups$()].sort((a, b) => {
            if (pinOrder(a) !== pinOrder(b)) return pinOrder(a) - pinOrder(b)
            const left = of(a)
            const right = of(b)
            if (left.tone !== right.tone) return rank[left.tone] - rank[right.tone]
            if (left.tone === 'next') return left.time - right.time
            if (left.tone === 'past') return right.time - left.time
            return a.name.localeCompare(b.name) || a.id - b.id
        })
    })

    public isPinned(group: GroupOverviewType): boolean {
        return this.home.preferences().pinnedGroupIds.includes(group.id)
    }

    /** What the pin on a group's row does, for screen readers. */
    public pinLabel(group: GroupOverviewType, pinned: boolean): string {
        return pinned
            ? $localize`:Pin button on a group in the list on Home, when the group is pinned:Unpin ${group.name}:group:`
            : $localize`:Pin button on a group in the list on Home:Pin ${group.name}:group: to the top`
    }

    /** The pin's tooltip. */
    public pinTitle(pinned: boolean): string {
        return pinned
            ? $localize`:Tooltip of the pin button on a group in the list on Home, when the group is pinned:Unpin`
            : $localize`:Tooltip of the pin button on a group in the list on Home:Pin to the top`
    }

    /** Where "Plan a game night" goes: straight into the only group, or the planner that asks which one. */
    public readonly planLink = computed(() => {
        const groups = this.userGroups$()
        if (groups.length === 1 && groups[0]) return { link: ['/groups', groups[0].id, 'sessions', 'new'], query: null }
        return { link: ['/play/upcoming-sessions'], query: { plan: 1 } }
    })

    /** Your page in the first group on Home: the one you pinned first, or the one you are most active in. */
    /** How many games are on your shelf; null until they have loaded, so it never reads "0 games" (#256). */
    public readonly ownedGames = computed(() => settledValue(this.dataService.userGamesState())?.length ?? null)
    /** Every night you played, counted by the server (#252); null until it is known, so it never reads as 0. */
    public readonly nightsPlayed = computed(() => this.dataService.userHistorySummary()?.nights ?? null)

    /** The last three sessions you played, newest first. */
    public readonly recentlyPlayed = computed(() =>
        [...this.dataService.userHistory()]
            .sort((a, b) => new Date(b.meetData.meetDate).getTime() - new Date(a.meetData.meetDate).getTime())
            .slice(0, 3),
    )

    /** Attendees recorded as accounts, group people, or both, each counted once. */
    public peopleCount(record: HistoryRecordType): number {
        return mergeHistoryParticipants(record.attendedBy, record.attendedByPeople).length
    }

    public gameTitles(record: HistoryRecordType): string {
        return record.gamesPlayed.map((game) => gameTitle(game.gameData)).join(', ')
    }

    /** The first played game with artwork, for the row's thumbnail. */
    public firstGame(record: HistoryRecordType): { title: string; imageUrl: string } | null {
        const game = record.gamesPlayed[0]?.gameData
        return game ? { title: gameTitle(game), imageUrl: game.imageUrl } : null
    }

    public historyDate(record: HistoryRecordType): string {
        return sessionDate(record.meetData, { day: 'numeric', month: 'short', year: 'numeric' })
    }

    public hideBrokenImage(event: Event): void {
        const image = event.target
        if (image instanceof HTMLImageElement) image.hidden = true
    }

    public retryGroups() {
        this.dataService.refreshUserGroups()
        this.dataService.refreshUserMeets()
    }

    public retryHistory() {
        this.dataService.refreshUserHistory()
    }

    public retryInvitations() {
        this.dataService.retryUserInvitations()
    }
}
