import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CardGroupComponent } from '../../components/card-group/card-group.component'
import { SkeletonCardGroupComponent } from '../../components/skeletons/skeleton-card-group/skeleton-card-group.component'
import { DataService } from '../../core/services/data.service'

@Component({
    imports: [CardGroupComponent, RouterLink, SkeletonCardGroupComponent],
    templateUrl: 'dashboard.component.html',
})
export class DashboardComponent {
    private readonly dataService = inject(DataService)

    // --------------------------------------------------------------------------
    //        signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly loadingStatesIndex$ = this.dataService.loadingStatesIndex
    public readonly userGroups$ = this.dataService.userGroups
    public readonly invitationsGroupIndex$ = this.dataService.invitationsGroupIndex
}
