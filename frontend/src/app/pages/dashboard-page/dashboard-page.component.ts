import { Component, inject } from '@angular/core'
import { CardSectionComponent } from '../../components/cards/card-section/card-section.component'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { BadgeComponent } from '../../components/ui/badge/badge.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { DataService } from '../../core/services/data.service'

@Component({
    imports: [ContainerWrapperComponent, PageHeaderComponent, CardSectionComponent, BadgeComponent, ImageProfileComponent],
    templateUrl: 'dashboard-page.component.html',
})
export class DashboardPageComponent {
    private readonly dataService = inject(DataService)

    // --------------------------------------------------------------------------
    //        signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGroups$ = this.dataService.userGroups
    public readonly userGames$ = this.dataService.userGames
    public readonly userMeets$ = this.dataService.userMeets
    public readonly userHistory$ = this.dataService.userHistory
    public readonly userStats$ = this.dataService.userStats
}
