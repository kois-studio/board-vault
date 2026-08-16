import { CommonModule } from '@angular/common'
import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
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
        RouterLink,
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
    public readonly userGroups$ = this.dataService.userGroups
    public readonly userHistory$ = this.dataService.userHistory
    public readonly historyError = this.dataService.userHistoryError
    // loadingService
    public readonly isLoadingHistory = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GAMES_HISTORY])

    // --------------------------------------------------------------------------
    //        Computed
    // --------------------------------------------------------------------------
    public readonly sortedUserHistoryComputed = computed(() => {
        return [...this.userHistory$()].sort((a, b) => new Date(b.meetData.meetDate).getTime() - new Date(a.meetData.meetDate).getTime())
    })

    public getGroupName(groupId: number): string {
        return this.userGroups$().find(group => group.id === groupId)?.name ?? `Group ${groupId}`
    }

    public retryHistory(): void {
        this.dataService.refreshUserHistory()
    }
}
