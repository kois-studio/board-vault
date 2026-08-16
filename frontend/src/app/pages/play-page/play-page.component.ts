import { CommonModule } from '@angular/common'
import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CardSectionComponent } from '../../components/cards/card-section/card-section.component'
import { BadgeComponent } from '../../components/ui/badge/badge.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { DataService } from '../../core/services/data.service'

@Component({
    imports: [
        CommonModule,
        PageHeaderComponent,
        ButtonComponent,
        ContainerWrapperComponent,
        CardSectionComponent,
        BadgeComponent,
        RouterLink,
    ],
    templateUrl: 'play-page.component.html',
})
export class PlayPageComponent {
    private readonly dataService = inject(DataService)

    // --------------------------------------------------------------------------
    //        signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly userGroups$ = this.dataService.userGroups
    public readonly userMeets$ = this.dataService.userMeets
    public readonly userHistory$ = this.dataService.userHistory
    public readonly upcomingSessions = computed(() =>
        [...this.userMeets$()]
            .filter(meet => meet.status === 'scheduled' || meet.status === 'active')
            .sort((a, b) => new Date(a.meetDate).getTime() - new Date(b.meetDate).getTime()),
    )

    public getGroupName(groupId: number): string {
        return this.userGroups$().find(group => group.id === groupId)?.name ?? `Group ${groupId}`
    }
}
