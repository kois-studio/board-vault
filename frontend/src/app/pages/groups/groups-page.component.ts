import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CardSectionComponent } from '../../components/cards/card-section/card-section.component'
import { BadgeComponent } from '../../components/ui/badge/badge.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'

@Component({
    imports: [PageHeaderComponent, ButtonComponent, RouterLink, ContainerWrapperComponent, CardSectionComponent, BadgeComponent],
    templateUrl: 'groups-page.component.html',
})
export class GroupsPageComponent {}
