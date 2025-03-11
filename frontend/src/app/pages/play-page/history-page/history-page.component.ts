import { CommonModule } from '@angular/common'
import { Component, computed, inject } from '@angular/core'
import type { HistoryRecordType } from '../../../api/api.types'
import { SkeletonCardGroupComponent } from '../../../components/skeletons/skeleton-card-group/skeleton-card-group.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { TitleSubtitleComponent } from '../../../components/ui/title-subtitle/title-subtitle.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { CustomDatePipe } from '../../../core/pipes/customDate.pipe'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'

@Component({
    imports: [CommonModule, TitleSubtitleComponent, ContainerWrapperComponent, CustomDatePipe, SkeletonCardGroupComponent],
    templateUrl: 'history-page.component.html',
})
export class HistoryPageComponent {
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userHistory$ = this.dataService.userHistory
    // loadingService
    public readonly isLoadingHistory = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GAMES_HISTORY])

    // --------------------------------------------------------------------------
    //        Computed
    // --------------------------------------------------------------------------
    public readonly groupedGamesByDateComputed = computed(() => {
        return this.userHistory$().reduce(
            (groups, game) => {
                const date = new Date(game.meetData.meetDate).toLocaleDateString()
                if (!groups[date]) {
                    groups[date] = []
                }
                groups[date].push(game)
                return groups
            },
            {} as Record<string, Array<HistoryRecordType>>,
        )
    })

    /**
     * This is to avoid a certain error with the date
     */
    public isValidDate(date: any): boolean {
        if (!date) return false
        const d = new Date(date)
        return !Number.isNaN(d.getTime())
    }
}
