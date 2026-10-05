import { Component, computed, inject, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import type { HistoryRecordType } from '../../../api/api.types'
import { HistoryEntryComponent, type HistoryEntryView } from '../../../components/history-entry/history-entry.component'
import { SkeletonHistoryComponent } from '../../../components/skeletons/skeleton-history/skeleton-history.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { CustomDatePipe } from '../../../core/pipes/customDate.pipe'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'
import { formatAttendeeSummary } from '../../../core/utils/formatAttendeeSummary'
import {
    formatWinners,
    type HistoryParticipant,
    historyWinnerNames,
    mergeHistoryParticipants,
} from '../../../core/utils/historyParticipants'
import { sessionDateParts } from '../../../core/utils/sessionTiming'

/** Sessions shown at first, and added by each "Show older sessions". */
const PAGE_SIZE = 10
const MONTH_FORMAT = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })

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
    public readonly userHistory$ = this.dataService.userHistory
    public readonly historyError = this.dataService.userHistoryError
    // loadingService
    public readonly isLoadingHistory = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GAMES_HISTORY])
    public readonly groupIdFilter = signal(this.readGroupIdFilter())
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
    public readonly historyTitle = computed(() => (this.historyGroupName() ? `${this.historyGroupName()} history` : 'History'))

    // --------------------------------------------------------------------------
    //        Computed
    // --------------------------------------------------------------------------
    public readonly sortedUserHistoryComputed = computed(() => {
        const groupId = this.groupIdFilter()
        return [...this.userHistory$()]
            .filter((historyRecord) => !groupId || historyRecord.meetData.groupId === groupId)
            .sort((a, b) => new Date(b.meetData.meetDate).getTime() - new Date(a.meetData.meetDate).getTime())
    })

    public readonly hasFilteredHistory = computed(() => this.sortedUserHistoryComputed().length > 0)
    public readonly visibleCount = signal(PAGE_SIZE)
    public readonly hiddenCount = computed(() => Math.max(0, this.sortedUserHistoryComputed().length - this.visibleCount()))
    /** The visible sessions, grouped by the month they were played in. */
    public readonly visibleMonths = computed(() => {
        const months: Array<{ key: string; label: string; records: Array<HistoryRecordType> }> = []
        for (const record of this.sortedUserHistoryComputed().slice(0, this.visibleCount())) {
            const date = new Date(record.meetData.meetDate)
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`
            const month = months.at(-1)
            if (month?.key === key) month.records.push(record)
            else months.push({ key, label: MONTH_FORMAT.format(date), records: [record] })
        }
        return months
    })
    public readonly dateParts = sessionDateParts
    public readonly historySummary = computed(() => {
        const records = this.sortedUserHistoryComputed()
        const gameCounts = new Map<number, { title: string; count: number }>()
        const people = new Set<string>()
        let gamesPlayed = 0

        for (const record of records) {
            for (const attendee of this.getAttendees(record)) people.add(attendee.key)
            for (const game of record.gamesPlayed) {
                for (const player of this.getPlayers(game)) people.add(player.key)
                gamesPlayed += 1
                const current = gameCounts.get(game.gameData.id)
                gameCounts.set(game.gameData.id, {
                    title: game.gameData.titleTranslations.en || game.gameData.title || 'Untitled game',
                    count: (current?.count ?? 0) + 1,
                })
            }
        }

        const mostPlayed = [...gameCounts.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))[0] ?? null
        return {
            sessions: records.length,
            gamesPlayed,
            uniqueGames: gameCounts.size,
            people: people.size,
            mostPlayed,
        }
    })
    public readonly mostPlayedSummary = computed(() => {
        const mostPlayed = this.historySummary().mostPlayed
        return mostPlayed ? `${mostPlayed.title} · ${mostPlayed.count} session${mostPlayed.count === 1 ? '' : 's'}` : null
    })

    private readonly customDate = new CustomDatePipe()

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
            attendees: attendees.map((person) => ({ key: person.key, name: person.displayName, avatar: this.avatarFor(person) })),
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
                    winners: this.getWinners(gamePlayed),
                    playedBy: players.length === 0 ? null : this.getPlayedBySummary(players),
                    everyonePlayed: this.playedEveryone(players, attendees),
                }
            }),
        }
    }

    public getGroupName(groupId: number): string {
        return this.userGroups$().find((group) => group.id === groupId)?.name ?? 'Selected group'
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

    public showMore(): void {
        this.visibleCount.update((count) => count + PAGE_SIZE)
    }

    public getAttendeeSummary(attendees: Array<{ displayName: string; username: string }>): string {
        return formatAttendeeSummary(attendees)
    }

    public getPlayedBySummary(players: Array<{ displayName: string; username: string }>): string {
        return formatAttendeeSummary(players).replace(/^With /, '')
    }

    public retryHistory(): void {
        this.dataService.refreshUserHistory()
    }

    public setGroupFilter(event: Event): void {
        const value = (event.target as HTMLSelectElement).value
        const groupId = Number(value)
        const nextGroupId = Number.isInteger(groupId) && groupId > 0 ? groupId : null
        this.groupIdFilter.set(nextGroupId)
        this.visibleCount.set(PAGE_SIZE)
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { groupId: nextGroupId },
            queryParamsHandling: 'merge',
        })
    }

    public getGameTitle(game: { titleTranslations: { en: string }; title?: string }): string {
        return game.titleTranslations.en || game.title || 'Untitled game'
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

    private readGroupIdFilter(): number | null {
        const groupId = Number(this.route.snapshot.queryParamMap.get('groupId'))
        return Number.isInteger(groupId) && groupId > 0 ? groupId : null
    }
}
