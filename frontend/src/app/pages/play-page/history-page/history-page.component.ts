import { CommonModule } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { ImageProfileComponent } from '../../../components/image-profile/image-profile.component'
import { SkeletonHistoryComponent } from '../../../components/skeletons/skeleton-history/skeleton-history.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { CustomDatePipe } from '../../../core/pipes/customDate.pipe'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'
import { formatAttendeeSummary } from '../../../core/utils/formatAttendeeSummary'

@Component({
    imports: [
        CommonModule,
        RouterLink,
        ContainerWrapperComponent,
        CustomDatePipe,
        SkeletonHistoryComponent,
        ImageProfileComponent,
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
    public readonly userHistory$ = this.dataService.userHistory
    public readonly historyError = this.dataService.userHistoryError
    // loadingService
    public readonly isLoadingHistory = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GAMES_HISTORY])
    public readonly groupIdFilter = signal(this.readGroupIdFilter())
    public readonly historyGroupName = computed(() => {
        const groupId = this.groupIdFilter()
        return groupId ? this.getGroupName(groupId) : null
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
    public readonly historySummary = computed(() => {
        const records = this.sortedUserHistoryComputed()
        const gameCounts = new Map<number, { title: string; count: number }>()
        const people = new Set<number>()
        let gamesPlayed = 0

        for (const record of records) {
            for (const attendee of record.attendedBy) people.add(attendee.id)
            for (const game of record.gamesPlayed) {
                for (const player of game.playedBy) people.add(player.id)
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

    public getGroupName(groupId: number): string {
        return this.userGroups$().find((group) => group.id === groupId)?.name ?? `Group ${groupId}`
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
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { groupId: nextGroupId },
            queryParamsHandling: 'merge',
        })
    }

    public getGameTitle(game: { titleTranslations: { en: string }; title?: string }): string {
        return game.titleTranslations.en || game.title || 'Untitled game'
    }

    private readGroupIdFilter(): number | null {
        const groupId = Number(this.route.snapshot.queryParamMap.get('groupId'))
        return Number.isInteger(groupId) && groupId > 0 ? groupId : null
    }
}
