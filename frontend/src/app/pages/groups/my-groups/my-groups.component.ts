import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CardGroupComponent } from '../../../components/card-group/card-group.component'
import { SkeletonCardGroupComponent } from '../../../components/skeletons/skeleton-card-group/skeleton-card-group.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'

@Component({
    imports: [SkeletonCardGroupComponent, CardGroupComponent, RouterLink],
    templateUrl: 'my-groups.component.html',
})
export class MyGroupsComponent {
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)

    // --------------------------------------------------------------------------
    //        signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly userGroups$ = this.dataService.userGroups
    public readonly invitationsGroupIndex$ = this.dataService.invitationsGroupIndex
    // loadingService
    public readonly isLoadingGroups = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GROUPS])
}
