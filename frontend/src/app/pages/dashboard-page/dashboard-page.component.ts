import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { AccountMeetType, GameCompleteType, GroupWithMembersAndGames, HistoryRecordType } from '../../api/api.types'
import { CardGroupComponent } from '../../components/card-group/card-group.component'
import { CardInvitationComponent } from '../../components/card-invitation/card-invitation.component'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { NextNightCardComponent } from '../../components/next-night-card/next-night-card.component'
import { SessionAnswerComponent } from '../../components/session-answer/session-answer.component'
import { SkeletonCardGroupComponent } from '../../components/skeletons/skeleton-card-group/skeleton-card-group.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { groupGameCount, groupPeopleCount } from '../../core/utils/groupCounts'
import { mergeHistoryParticipants } from '../../core/utils/historyParticipants'
import { relativeDay, sessionDateParts, upcomingState } from '../../core/utils/sessionTiming'

/** How a group's row on Home says where it stands. */
export type GroupActivity = { tone: 'live' | 'next' | 'past' | 'none'; label: string; time: number }

/**
 * Home: the signed-in starting point. It follows where the person is: a new account is pointed at its
 * first group; after that the next game night leads, then the group (one large card, or a compact list
 * when there are several), then what was played lately. Groups live here; there is no separate groups page.
 */
@Component({
    imports: [
        ButtonComponent,
        CardGroupComponent,
        CardInvitationComponent,
        ContainerWrapperComponent,
        IconComponent,
        ImageProfileComponent,
        NextNightCardComponent,
        RouterLink,
        SessionAnswerComponent,
        SkeletonCardGroupComponent,
    ],
    templateUrl: 'dashboard-page.component.html',
})
export class DashboardPageComponent {
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)

    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGroups$ = this.dataService.userGroups
    public readonly userGroupsError = this.dataService.userGroupsError
    public readonly userMeetsError = this.dataService.userMeetsError
    public readonly userInvitations$ = this.dataService.userInvitations
    public readonly userInvitationsError = this.dataService.userInvitationsError
    public readonly isLoadingInvitations = this.dataService.userInvitationsLoading
    public readonly invitationsGroupIndex$ = this.dataService.invitationsGroupIndex

    private readonly loading = computed(() => this.loadingService.loadingStatesIndex())
    public readonly isLoadingGroups = computed(() => this.loading()[LOADING_KEYS.USER_GROUPS])
    public readonly isLoadingMeets = computed(() => this.loading()[LOADING_KEYS.USER_MEETS])

    public readonly greetingName = computed(() => {
        const user = this.currentUser$()
        return user?.displayName || user?.username || ''
    })

    /** No group yet, and nothing failed or still loading: the page is about making the first one. */
    public readonly isNew = computed(() => !this.isLoadingGroups() && !this.userGroupsError() && this.userGroups$().length === 0)
    public readonly hasGames = computed(() => this.dataService.userGames().length > 0)

    private readonly groupsById = computed(() => new Map(this.userGroups$().map((group) => [group.id, group])))

    public groupName(groupId: number): string {
        return this.groupsById().get(groupId)?.name ?? 'Your group'
    }

    /** Every game in the next night's group, members' and people's without an account, to show its shortlist. */
    public readonly nextNightGames = computed(() => {
        const group = this.groupsById().get(this.nextNight()?.groupId ?? Number.NaN)
        const games = new Map<number, GameCompleteType>()
        for (const game of [
            ...(group?.members ?? []).flatMap((member) => member.games),
            ...(group?.placeholders ?? []).flatMap((person) => person.games),
        ]) {
            games.set(game.id, game)
        }
        return games
    })

    /** "Azul, Wingspan" for the games you said you'd bring; they are on your own shelf. */
    public gamesToBringLabel(meet: AccountMeetType): string {
        const shelf = new Map(this.dataService.userGames().map((game) => [game.id, game.titleTranslations.en || game.title || 'a game']))
        return meet.gamesToBring.map((gameId) => shelf.get(gameId) ?? 'a game').join(', ')
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

    public shortDate(meet: AccountMeetType): string {
        const parts = sessionDateParts(meet)
        return `${parts.weekday} ${parts.day} ${parts.month} · ${parts.time}`
    }

    /** Per group: a night under way, the next planned one, or the last one played. */
    public readonly groupActivity = computed(() => {
        const activity = new Map<number, GroupActivity>()
        for (const group of this.userGroups$()) activity.set(group.id, { tone: 'none', label: 'No nights yet', time: 0 })

        // Soonest first, so the first planned night a group meets is its next one.
        for (const meet of this.upcomingSessions()) {
            const current = activity.get(meet.groupId)
            if (!current || current.tone === 'live' || current.tone === 'next') continue
            const time = new Date(meet.meetDate).getTime()
            if (upcomingState(meet) === 'live') activity.set(meet.groupId, { tone: 'live', label: 'Happening now', time })
            else {
                const relative = relativeDay(meet.meetDate)
                const parts = sessionDateParts(meet)
                const label = relative === 'Today' || relative === 'Tomorrow' ? relative : `${parts.day} ${parts.month}`
                activity.set(meet.groupId, { tone: 'next', label, time })
            }
        }
        for (const meet of this.dataService.userMeets()) {
            const current = activity.get(meet.groupId)
            if (meet.status !== 'completed' || !current || current.tone === 'live' || current.tone === 'next') continue
            const time = new Date(meet.meetDate).getTime()
            if (current.tone === 'past' && current.time >= time) continue
            const parts = sessionDateParts(meet)
            activity.set(meet.groupId, { tone: 'past', label: `Last: ${parts.day} ${parts.month}`, time })
        }
        return activity
    })

    /** With several groups: a night under way first, then the soonest planned, then the most recently played. */
    public readonly orderedGroups = computed(() => {
        const rank = { live: 0, next: 1, past: 2, none: 3 }
        const activity = this.groupActivity()
        const of = (group: GroupWithMembersAndGames) => activity.get(group.id) ?? { tone: 'none' as const, label: '', time: 0 }
        return [...this.userGroups$()].sort((a, b) => {
            const left = of(a)
            const right = of(b)
            if (left.tone !== right.tone) return rank[left.tone] - rank[right.tone]
            if (left.tone === 'next') return left.time - right.time
            if (left.tone === 'past') return right.time - left.time
            return a.name.localeCompare(b.name)
        })
    })

    public peopleInGroup(group: GroupWithMembersAndGames): number {
        return groupPeopleCount(group)
    }

    public gamesInGroup(group: GroupWithMembersAndGames): number {
        return groupGameCount(group)
    }

    /** Where "Plan a game night" goes: straight into the only group, or the planner that asks which one. */
    public readonly planLink = computed(() => {
        const groups = this.userGroups$()
        if (groups.length === 1 && groups[0]) return { link: ['/groups', groups[0].id, 'sessions', 'new'], query: null }
        return { link: ['/play/upcoming-sessions'], query: { plan: 1 } }
    })

    /** Your page in the group you are most active in: your games and nights there. */
    public readonly profileGroup = computed(() => this.orderedGroups()[0] ?? null)
    public readonly ownedGames = computed(() => this.dataService.userGames().length)
    public readonly nightsPlayed = computed(() => this.dataService.userHistory().length)

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
        return record.gamesPlayed.map((game) => game.gameData.titleTranslations.en ?? 'Untitled').join(', ')
    }

    /** The first played game with artwork, for the row's thumbnail. */
    public firstGame(record: HistoryRecordType): { title: string; imageUrl: string } | null {
        const game = record.gamesPlayed[0]?.gameData
        return game ? { title: game.titleTranslations.en || game.title || 'Untitled', imageUrl: game.imageUrl } : null
    }

    public historyDate(record: HistoryRecordType): string {
        const parts = sessionDateParts(record.meetData)
        return `${parts.day} ${parts.month} ${parts.year}`
    }

    public hideBrokenImage(event: Event): void {
        const image = event.target
        if (image instanceof HTMLImageElement) image.hidden = true
    }

    public retryGroups() {
        this.dataService.refreshUserGroups()
        this.dataService.refreshUserMeets()
    }

    public retryInvitations() {
        this.dataService.retryUserInvitations()
    }
}
