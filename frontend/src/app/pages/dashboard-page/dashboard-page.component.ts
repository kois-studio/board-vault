import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'

@Component({
    imports: [RouterLink, ContainerWrapperComponent, PageHeaderComponent, CustomDatePipe],
    templateUrl: 'dashboard-page.component.html',
})
export class DashboardPageComponent {
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)

    public readonly userGroups$ = this.dataService.userGroups
    public readonly userMeets$ = this.dataService.userMeets
    public readonly userGroupsError = this.dataService.userGroupsError
    public readonly userMeetsError = this.dataService.userMeetsError
    public readonly groupSummaries = computed(() => {
        return this.userGroups$().map((group) => {
            const nextMeeting =
                this.userMeets$()
                    .filter((meet) => meet.groupId === group.id && (meet.status === 'scheduled' || meet.status === 'active'))
                    .sort((a, b) => new Date(a.meetDate).getTime() - new Date(b.meetDate).getTime())[0] ?? null

            return {
                group,
                nextMeeting,
                gameCount: new Set(group.members.flatMap((member) => member.games.map((game) => game.id))).size,
            }
        })
    })
    public readonly isLoadingOverview = computed(() => {
        const loading = this.loadingService.loadingStatesIndex()
        return loading[LOADING_KEYS.USER_GROUPS] || loading[LOADING_KEYS.USER_MEETS]
    })
    public readonly hasOverviewError = computed(() => this.userGroupsError() || this.userMeetsError())

    public retryOverview() {
        this.dataService.refreshUserGroups()
        this.dataService.refreshUserMeets()
    }
}
