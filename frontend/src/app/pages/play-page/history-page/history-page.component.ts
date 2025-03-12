import { CommonModule } from '@angular/common'
import { Component, computed, inject } from '@angular/core'
import type { HistoryRecordType } from '../../../api/api.types'
import { ImageProfileComponent } from '../../../components/image-profile/image-profile.component'
import { SkeletonCardGroupComponent } from '../../../components/skeletons/skeleton-card-group/skeleton-card-group.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { CustomDatePipe } from '../../../core/pipes/customDate.pipe'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'

@Component({
    imports: [
        CommonModule,
        ContainerWrapperComponent,
        CustomDatePipe,
        SkeletonCardGroupComponent,
        ImageProfileComponent,
        PageHeaderComponent,
        ButtonComponent,
    ],
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
                // Use ISO format for consistent date handling
                const date = new Date(game.meetData.meetDate)
                const dateKey = date.toISOString().split('T')[0] // 'YYYY-MM-DD' format
                if (!groups[dateKey]) {
                    groups[dateKey] = []
                }
                groups[dateKey].push(game)
                return groups
            },
            {} as Record<string, Array<HistoryRecordType>>,
        )
    })
}
