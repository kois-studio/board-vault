import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'

@Component({
    imports: [RouterLink, ContainerWrapperComponent, PageHeaderComponent],
    templateUrl: 'dashboard-page.component.html',
})
export class DashboardPageComponent {
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)

    public readonly userGroups$ = this.dataService.userGroups
    public readonly userGames$ = this.dataService.userGames
    public readonly userHistory$ = this.dataService.userHistory
    public readonly userStats$ = this.dataService.userStats
    public readonly userGamesError = this.dataService.userGamesError
    public readonly userGroupsError = this.dataService.userGroupsError
    public readonly userStatsError = this.dataService.userStatsError
    public readonly userHistoryError = this.dataService.userHistoryError
    public readonly isLoadingOverview = computed(() => {
        const loading = this.loadingService.loadingStatesIndex()
        return (
            loading[LOADING_KEYS.USER_GAMES] ||
            loading[LOADING_KEYS.USER_GROUPS] ||
            loading[LOADING_KEYS.USER_STATS] ||
            loading[LOADING_KEYS.USER_GAMES_HISTORY]
        )
    })
    public readonly hasOverviewError = computed(
        () => this.userGamesError() || this.userGroupsError() || this.userStatsError() || this.userHistoryError(),
    )

    public retryOverview() {
        this.dataService.refreshUserGames()
        this.dataService.refreshUserGroups()
        this.dataService.refreshUserStats()
        this.dataService.refreshUserHistory()
    }
}
