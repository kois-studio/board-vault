import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CardSectionComponent } from '../../components/cards/card-section/card-section.component'
import { BadgeComponent } from '../../components/ui/badge/badge.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { isFirstLoad } from '../../core/async/resource-state'
import { intlLocale } from '../../core/i18n/format'
import { DataService } from '../../core/services/data.service'
import { relativeDay, upcomingState } from '../../core/utils/sessionTiming'

/** The Play landing page: one card per subpage. */
@Component({
    imports: [ButtonComponent, PageHeaderComponent, ContainerWrapperComponent, CardSectionComponent, BadgeComponent, RouterLink],
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
    public readonly userMeetsError = computed(() => this.dataService.userMeetsState().status === 'error')
    public readonly userHistoryError = computed(() => this.dataService.userHistoryState().status === 'error')
    public readonly isLoadingMeets = computed(() => isFirstLoad(this.dataService.userMeetsState()))
    public readonly isLoadingHistory = computed(() => isFirstLoad(this.dataService.userHistoryState()))
    public readonly upcomingSessions = computed(() =>
        [...this.userMeets$()]
            .filter((meet) => upcomingState(meet) !== null)
            .sort((a, b) => new Date(a.meetDate).getTime() - new Date(b.meetDate).getTime()),
    )
    public readonly wrapUpCount = computed(() => this.upcomingSessions().filter((meet) => upcomingState(meet) === 'wrap-up').length)
    public readonly nextSession = computed(() => this.upcomingSessions().find((meet) => upcomingState(meet) !== 'wrap-up') ?? null)
    /**
     * The History badge: every night recorded, counted by the server, since the app holds only the latest ones (#252).
     */
    public readonly historyBadge = computed(() => {
        if (isFirstLoad(this.dataService.userHistoryState()) || isFirstLoad(this.dataService.userHistorySummaryState()))
            return this.loadingLabel
        const nights = this.dataService.userHistorySummary()?.nights
        if (this.userHistoryError() || this.dataService.userHistorySummaryState().status === 'error') return this.unavailableLabel
        return nights === undefined ? this.loadingLabel : this.sessionsLabel(nights)
    })
    public readonly lastSession = computed(
        () =>
            [...this.userHistory$()].sort((a, b) => new Date(b.meetData.meetDate).getTime() - new Date(a.meetData.meetDate).getTime())[0] ??
            null,
    )

    public readonly relativeDay = relativeDay

    public readonly loadingLabel = $localize`:Badge on a Play card while its count loads:Loading…`
    public readonly unavailableLabel = $localize`:Badge on a Play card when its count could not load:Unavailable`

    public getGroupName(groupId: number): string {
        return (
            this.userGroups$().find((group) => group.id === groupId)?.name ??
            $localize`:Stands for the name of a group you are no longer in; the placeholder is its number:Group ${groupId}:id:`
        )
    }

    /** "1 session", "3 sessions". */
    public sessionsLabel(count: number): string {
        return new Intl.PluralRules(intlLocale()).select(count) === 'one'
            ? $localize`:play sessions badge, one|Badge on a Play card counting game nights, one:${count}:count: session`
            : $localize`:play sessions badge, other|Badge on a Play card counting game nights, more than one:${count}:count: sessions`
    }
}
