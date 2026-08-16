import { CommonModule } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { CustomDatePipe } from '../../../core/pipes/customDate.pipe'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'

@Component({
    imports: [
        CommonModule,
        RouterLink,
        ContainerWrapperComponent,
        CustomDatePipe,
        PageHeaderComponent,
        ButtonComponent,
    ],
    templateUrl: 'upcoming-sessions-page.component.html',
})
export class UpcomingSessionsPageComponent {
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGroups$ = this.dataService.userGroups
    public readonly userMeets$ = this.dataService.userMeets
    // loadingService
    public readonly isLoadingGroups = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GROUPS])

    // --------------------------------------------------------------------------
    //        Computed
    // --------------------------------------------------------------------------
    public readonly upcomingSessions = computed(() => {
        return [...this.userMeets$()]
            .filter(meet => meet.status === 'scheduled' || meet.status === 'active')
            .sort((a, b) => new Date(a.meetDate).getTime() - new Date(b.meetDate).getTime())
    })

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public readonly isSchedulingASession = signal(false)
}
