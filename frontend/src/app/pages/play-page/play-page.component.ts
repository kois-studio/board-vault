import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CardSectionComponent } from '../../components/cards/card-section/card-section.component'
import { BadgeComponent } from '../../components/ui/badge/badge.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { relativeDay, upcomingState } from '../../core/utils/sessionTiming'

/** The Play landing page: one card per subpage. */
@Component({
    imports: [ButtonComponent, PageHeaderComponent, ContainerWrapperComponent, CardSectionComponent, BadgeComponent, RouterLink],
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
            .filter((meet) => upcomingState(meet) !== null)
            .sort((a, b) => new Date(a.meetDate).getTime() - new Date(b.meetDate).getTime()),
    )
    public readonly wrapUpCount = computed(() => this.upcomingSessions().filter((meet) => upcomingState(meet) === 'wrap-up').length)
    public readonly nextSession = computed(() => this.upcomingSessions().find((meet) => upcomingState(meet) !== 'wrap-up') ?? null)
    public readonly lastSession = computed(
        () =>
            [...this.userHistory$()].sort((a, b) => new Date(b.meetData.meetDate).getTime() - new Date(a.meetData.meetDate).getTime())[0] ??
            null,
    )

    public readonly relativeDay = relativeDay

    public getGroupName(groupId: number): string {
        return this.userGroups$().find((group) => group.id === groupId)?.name ?? `Group ${groupId}`
    }

    public countLabel(count: number, noun: string): string {
        return `${count} ${noun}${count === 1 ? '' : 's'}`
    }
}
