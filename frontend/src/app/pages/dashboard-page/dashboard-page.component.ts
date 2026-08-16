import { Component, inject } from '@angular/core'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { DataService } from '../../core/services/data.service'

@Component({
    imports: [ContainerWrapperComponent, PageHeaderComponent],
    templateUrl: 'dashboard-page.component.html',
})
export class DashboardPageComponent {
    private readonly dataService = inject(DataService)

    public readonly userGroups$ = this.dataService.userGroups
    public readonly userGames$ = this.dataService.userGames
    public readonly userHistory$ = this.dataService.userHistory
    public readonly userStats$ = this.dataService.userStats
}
