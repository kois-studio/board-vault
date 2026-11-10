import { Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import type { Subscription } from 'rxjs'
import { Api } from '../../../api/api'
import type { HistoryRecordType, HistorySummaryType } from '../../../api/api.types'
import { HistoryEntryComponent, type HistoryEntryView } from '../../../components/history-entry/history-entry.component'
import { SkeletonHistoryComponent } from '../../../components/skeletons/skeleton-history/skeleton-history.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { formatDateTime, intlLocale } from '../../../core/i18n/format'
import { CustomDatePipe } from '../../../core/pipes/customDate.pipe'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'
import { attendeeNames, formatAttendeeSummary } from '../../../core/utils/formatAttendeeSummary'
import { gameTitle } from '../../../core/utils/gameTitle'
import { HistoryPager } from '../../../core/utils/historyPager'
import {
    formatWinners,
    type HistoryParticipant,
    historyWinnerNames,
    mergeHistoryParticipants,
} from '../../../core/utils/historyParticipants'
import { sessionDateParts } from '../../../core/utils/sessionTiming'

/** Sessions read at first, and by each "Show older sessions" (#252). */
const PAGE_SIZE = 20

@Component({
    imports: [
        RouterLink,
        ContainerWrapperComponent,
        IconComponent,
        SkeletonHistoryComponent,
        HistoryEntryComponent,
        PageHeaderComponent,
        ButtonComponent,
    ],
    templateUrl: 'history-page.component.html',
})
export class HistoryPageComponent {
    private readonly api = inject(Api)
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)
    private readonly route = inject(ActivatedRoute)
    private readonly router = inject(Router)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGroups$ = this.dataService.userGroups
    public readonly groupsError = this.dataService.userGroupsError
    /** Your history, or one group's part of it, read from the server a page at a time, newest first (#252). */
    public readonly history = new HistoryPager((options) => this.api.getUserGamesHistory(this.currentUser$()?.id ?? 0, options), PAGE_SIZE)
    public readonly historyError = this.history.failed
    /** Totals over every night of the filter, not only the ones shown; null until they load. */
    public readonly summary = signal<HistorySummaryType | null>(null)
    public readonly isLoadingHistory = computed(() => !this.currentUser$() || this.history.loading())
    public readonly groupIdFilter = signal(this.readGroupIdFilter())
    /** Only the id, so editing your profile keeps the older sessions already shown. */
    private readonly userId = computed(() => this.currentUser$()?.id)
    public readonly historyGroupName = computed(() => {
        const groupId = this.groupIdFilter()
        return groupId ? this.getGroupName(groupId) : null
    })
    public readonly isLoadingGroups = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GROUPS])
    public readonly isUnknownGroupFilter = computed(() => {
        const groupId = this.groupIdFilter()
        return Boolean(
            groupId && !this.isLoadingGroups() && !this.groupsError() && !this.userGroups$().some((group) => group.id === groupId),
        )
    })
    public readonly historyTitle = computed(() => {
        const group = this.historyGroupName()
        return group
            ? $localize`:Title of the History page filtered to one group; the placeholder is the group name:${group}:group: history`
            : $localize`:Title of the History page:History`
    })

    // --------------------------------------------------------------------------
    //        Computed
    // --------------------------------------------------------------------------
    public readonly hasFilteredHistory = computed(() => this.history.entries().length > 0)
    /** Older sessions not shown yet, once the totals say how many; null while that is unknown. */
    public readonly hiddenCount = computed(() => {
        const nights = this.summary()?.nights
        return nights === undefined ? null : Math.max(0, nights - this.history.entries().length)
    })
    /** The sessions shown, grouped by the month they were played in. */
    public readonly visibleMonths = computed(() => {
        const months: Array<{ key: string; label: string; records: Array<HistoryRecordType> }> = []
        for (const record of this.history.entries()) {
            const date = new Date(record.meetData.meetDate)
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`
            const month = months.at(-1)
            if (month?.key === key) month.records.push(record)
            else months.push({ key, label: formatDateTime(date, { month: 'long', year: 'numeric' }), records: [record] })
        }
        return months
    })
    public readonly dateParts = sessionDateParts
    /** The numbers at the top, counted by the server over every night of the filter; null until they load. */
    public readonly historySummary = computed(() => {
        const summary = this.summary()
        if (!summary) return null
        return {
            sessions: summary.nights,
            gamesPlayed: summary.gamesPlayed,
            uniqueGames: summary.uniqueGames,
            people: summary.people,
            mostPlayed: summary.mostPlayed ? { title: gameTitle(summary.mostPlayed.game), count: summary.mostPlayed.nights } : null,
        }
    })
    public readonly mostPlayedSummary = computed(() => {
        const mostPlayed = this.historySummary()?.mostPlayed
        if (!mostPlayed) return null
        const { title, count } = mostPlayed
        return new Intl.PluralRules(intlLocale()).select(count) === 'one'
            ? $localize`:most played sessions, one|After Most played on History; a game title, then in how many game nights it was played, one:${title}:title: · ${count}:count: session`
            : $localize`:most played sessions, other|After Most played on History; a game title, then in how many game nights it was played, more than one:${title}:title: · ${count}:count: sessions`
    })

    private readonly customDate = new CustomDatePipe()
    private summaryRequest: Subscription | null = null

    constructor() {
        // The first page and the totals of the filter: again for another user, another group, or a changed history.
        effect(() => {
            const userId = this.userId()
            const groupId = this.groupIdFilter() ?? undefined
            this.dataService.userHistoryRevision()
            untracked(() => this.load(userId, groupId))
        })
        inject(DestroyRef).onDestroy(() => {
            this.history.destroy()
            this.summaryRequest?.unsubscribe()
        })
    }

    /** The view of one recorded night for `<app-history-entry>`. */
    public toHistoryEntry(record: HistoryRecordType): HistoryEntryView {
        const meet = record.meetData
        const when = this.dateParts(meet)
        const attendees = this.getAttendees(record)

        return {
            id: String(meet.id),
            title: this.getGroupName(meet.groupId),
            dateLabel: this.customDate.transform(meet.meetDate, true, meet.timezone),
            weekday: when.weekday,
            day: when.day,
            link: ['/sessions', meet.id],
            attendees: attendees.map((person) => ({
                key: person.key,
                name: person.displayName,
                avatar: this.avatarFor(person),
                standing: person.standing,
            })),
            attendeeSummary: this.getAttendeeSummary(attendees),
            notes: meet.notes,
            games: record.gamesPlayed.map((gamePlayed) => {
                const title = this.getGameTitle(gamePlayed.gameData)
                const players = this.getPlayers(gamePlayed)
                return {
                    key: String(gamePlayed.gameData.id),
                    title,
                    initials: this.getGameInitials(title),
                    imageUrl: gamePlayed.gameData.imageUrl || null,
                    link: ['/games', gamePlayed.gameData.id],
                    winners: (gamePlayed.playCount ?? 1) > 1 ? '' : this.getWinners(gamePlayed),
                    playCount: gamePlayed.playCount,
                    playedBy: players.length === 0 ? null : this.getPlayedBySummary(players),
                    everyonePlayed: this.playedEveryone(players, attendees),
                }
            }),
        }
    }

    public getGroupName(groupId: number): string {
        return (
            this.userGroups$().find((group) => group.id === groupId)?.name ??
            $localize`:Stands for the name of a group that is not loaded, on History:Selected group`
        )
    }

    /** Attendees recorded as accounts, group people, or both, each listed once. */
    public getAttendees(record: HistoryRecordType): Array<HistoryParticipant> {
        return mergeHistoryParticipants(record.attendedBy, record.attendedByPeople)
    }

    /** Players of one game, recorded as accounts, group people, or both, each listed once. */
    public getWinners(game: HistoryRecordType['gamesPlayed'][number]): string {
        return formatWinners(historyWinnerNames(game))
    }

    public getPlayers(game: HistoryRecordType['gamesPlayed'][number]): Array<HistoryParticipant> {
        return mergeHistoryParticipants(game.playedBy, game.playedByPeople)
    }

    /** People without an avatar (no account) show their initials. */
    public avatarFor(person: HistoryParticipant): HistoryParticipant['avatar'] {
        return (
            person.avatar ?? {
                type: 'initials',
                initials: this.getGameInitials(person.displayName),
                backgroundColor: '#64748b',
                iconName: null,
                emoji: null,
            }
        )
    }

    /** True when every attendee played the game, so the card can say "Everyone played". */
    public playedEveryone(players: Array<HistoryParticipant>, attendees: Array<HistoryParticipant>): boolean {
        if (attendees.length < 2) return false
        const playerKeys = new Set(players.map((player) => player.key))
        return attendees.every((attendee) => playerKeys.has(attendee.key))
    }

    /** Reads the sessions before the last one shown. */
    public showMore(): void {
        this.history.loadMore()
    }

    public getAttendeeSummary(attendees: Array<{ displayName: string; username: string }>): string {
        return formatAttendeeSummary(attendees)
    }

    public getPlayedBySummary(players: Array<{ displayName: string; username: string }>): string {
        return attendeeNames(players)
    }

    /** Tries again what failed: the first page with its totals, or the older page. */
    public retryHistory(): void {
        if (this.history.failed()) this.load(this.currentUser$()?.id, this.groupIdFilter() ?? undefined)
        else this.history.retry()
    }

    public setGroupFilter(event: Event): void {
        const value = (event.target as HTMLSelectElement).value
        const groupId = Number(value)
        const nextGroupId = Number.isInteger(groupId) && groupId > 0 ? groupId : null
        this.groupIdFilter.set(nextGroupId)
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { groupId: nextGroupId },
            queryParamsHandling: 'merge',
        })
    }

    public getGameTitle(game: Parameters<typeof gameTitle>[0]): string {
        return gameTitle(game)
    }

    /** First letters of the first two words: "Love Letter" is "LL". */
    public getGameInitials(title: string): string {
        return title
            .split(/\s+/)
            .filter(Boolean)
            .map((word) => word[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
    }

    /** The first page and the totals of the filter. The totals only add numbers, so if they fail the list still shows. */
    private load(userId: number | undefined, groupId: number | undefined): void {
        this.summaryRequest?.unsubscribe()
        this.summary.set(null)
        if (!userId) return
        this.history.reset({ groupId })
        this.summaryRequest = this.api.getUserHistorySummary(userId, { groupId }).subscribe({
            next: (summary) => this.summary.set(summary),
            error: () => this.summary.set(null),
        })
    }

    private readGroupIdFilter(): number | null {
        const groupId = Number(this.route.snapshot.queryParamMap.get('groupId'))
        return Number.isInteger(groupId) && groupId > 0 ? groupId : null
    }
}
