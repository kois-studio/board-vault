import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CardSectionComponent } from '../../components/cards/card-section/card-section.component'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { BadgeComponent } from '../../components/ui/badge/badge.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { DataService } from '../../core/services/data.service'

@Component({
    imports: [
        PageHeaderComponent,
        ButtonComponent,
        RouterLink,
        ContainerWrapperComponent,
        CardSectionComponent,
        BadgeComponent,
        ImageProfileComponent,
    ],
    templateUrl: 'groups-page.component.html',
})
export class GroupsPageComponent {
    private readonly dataService = inject(DataService)

    // --------------------------------------------------------------------------
    //        signals
    // --------------------------------------------------------------------------
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGroups$ = this.dataService.userGroups
    public readonly invitationsGroupIndex$ = this.dataService.invitationsGroupIndex
}
