import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CardSectionComponent } from '../../components/cards/card-section/card-section.component'
import { BadgeComponent } from '../../components/ui/badge/badge.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'

/** The Play landing page: one card per subpage. */
@Component({
    imports: [
        ButtonComponent,
        PageHeaderComponent,
        ContainerWrapperComponent,
        CardSectionComponent,
        BadgeComponent,
        RouterLink,
        CustomDatePipe,
    ],
    templateUrl: 'play-page.component.html',
})
export class PlayPageComponent {
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)

    // --------------------------------------------------------------------------
    //        signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly userGroups$ = this.dataService.userGroups
    public readonly userMeets$ = this.dataService.userMeets
    public readonly userHistory$ = this.dataService.userHistory
    public readonly userMeetsError = this.dataService.userMeetsError
    public readonly userHistoryError = this.dataService.userHistoryError
    public readonly isLoadingMeets = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_MEETS])
    public readonly isLoadingHistory = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GAMES_HISTORY])
    public readonly upcomingSessions = computed(() =>
        [...this.userMeets$()]
            .filter((meet) => meet.status === 'scheduled' || meet.status === 'active')
            .sort((a, b) => new Date(a.meetDate).getTime() - new Date(b.meetDate).getTime()),
    )

    public getGroupName(groupId: number): string {
        return this.userGroups$().find((group) => group.id === groupId)?.name ?? `Group ${groupId}`
    }
}
