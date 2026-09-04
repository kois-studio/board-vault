import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CardGroupComponent } from '../../../components/card-group/card-group.component'
import { CardInvitationComponent } from '../../../components/card-invitation/card-invitation.component'
import { SkeletonCardGroupComponent } from '../../../components/skeletons/skeleton-card-group/skeleton-card-group.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'

@Component({
    imports: [
        SkeletonCardGroupComponent,
        CardGroupComponent,
        CardInvitationComponent,
        RouterLink,
        PageHeaderComponent,
        ButtonComponent,
        ContainerWrapperComponent,
    ],
    templateUrl: 'groups-page.component.html',
})
export class GroupsPageComponent {
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)

    // --------------------------------------------------------------------------
    //        signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly userGroups$ = this.dataService.userGroups
    public readonly userGroupsError = this.dataService.userGroupsError
    public readonly userInvitations$ = this.dataService.userInvitations
    public readonly userInvitationsError = this.dataService.userInvitationsError
    public readonly isLoadingInvitations = this.dataService.userInvitationsLoading
    public readonly invitationsGroupIndex$ = this.dataService.invitationsGroupIndex
    // loadingService
    public readonly isLoadingGroups = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GROUPS])

    public retryGroups() {
        this.dataService.refreshUserGroups()
    }

    public retryInvitations() {
        this.dataService.retryUserInvitations()
    }
}
