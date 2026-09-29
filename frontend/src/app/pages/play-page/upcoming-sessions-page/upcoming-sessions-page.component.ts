import { Component, computed, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { MeetType } from '../../../api/api.types'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { CustomDatePipe } from '../../../core/pipes/customDate.pipe'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'

@Component({
    imports: [RouterLink, ContainerWrapperComponent, CustomDatePipe, PageHeaderComponent, ButtonComponent, IconComponent],
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
    public readonly groupsError = this.dataService.userGroupsError
    public readonly userMeets$ = this.dataService.userMeets
    // loadingService
    public readonly isLoadingGroups = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GROUPS])
    public readonly isLoadingMeets = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_MEETS])
    public readonly meetsError = this.dataService.userMeetsError

    // --------------------------------------------------------------------------
    //        Computed
    // --------------------------------------------------------------------------
    public readonly upcomingSessions = computed(() => {
        return [...this.userMeets$()]
            .filter((meet) => meet.status === 'scheduled' || meet.status === 'active')
            .sort((a, b) => new Date(a.meetDate).getTime() - new Date(b.meetDate).getTime())
    })

    public getGroupName(groupId: number): string {
        return this.userGroups$().find((group) => group.id === groupId)?.name ?? `Group ${groupId}`
    }

    public getGroupContext(groupId: number): string {
        const group = this.userGroups$().find((candidate) => candidate.id === groupId)
        if (!group) return 'Shared group context unavailable'

        const gameIds = new Set(group.members.flatMap((member) => member.games.map((game) => game.id)))
        return `${group.members.length} people · ${gameIds.size} games available`
    }

    public getStatusLabel(status: MeetType['status']): string {
        switch (status) {
            case 'scheduled':
                return 'Planned'
            case 'active':
                return 'Live now'
            default:
                return status
        }
    }

    public getSessionActionLabel(status: MeetType['status']): string {
        return status === 'active' ? 'Open live session' : 'Open session'
    }

    public getSessionPrompt(status: MeetType['status']): string {
        return status === 'active' ? 'Record what the group actually plays' : 'Review attendees and the game shortlist'
    }

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public readonly isSchedulingASession = signal(false)

    public retrySessions(): void {
        this.dataService.refreshUserMeets()
    }

    public retryGroups(): void {
        this.dataService.refreshUserGroups()
    }
}
