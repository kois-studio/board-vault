import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { HistoryRecordType } from '../../api/api.types'
import { CardGroupComponent } from '../../components/card-group/card-group.component'
import { CardInvitationComponent } from '../../components/card-invitation/card-invitation.component'
import { SkeletonCardGroupComponent } from '../../components/skeletons/skeleton-card-group/skeleton-card-group.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { mergeHistoryParticipants } from '../../core/utils/historyParticipants'
import { upcomingState } from '../../core/utils/sessionTiming'

/**
 * Home: the signed-in starting point. Groups live here (there is no separate
 * groups page), together with what is coming up and what was played lately.
 */
@Component({
    imports: [
        ButtonComponent,
        RouterLink,
        ContainerWrapperComponent,
        PageHeaderComponent,
        CustomDatePipe,
        IconComponent,
        CardGroupComponent,
        CardInvitationComponent,
        SkeletonCardGroupComponent,
    ],
    templateUrl: 'dashboard-page.component.html',
})
export class DashboardPageComponent {
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)

    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGroups$ = this.dataService.userGroups
    public readonly userGroupsError = this.dataService.userGroupsError
    public readonly userMeetsError = this.dataService.userMeetsError
    public readonly userInvitations$ = this.dataService.userInvitations
    public readonly userInvitationsError = this.dataService.userInvitationsError
    public readonly isLoadingInvitations = this.dataService.userInvitationsLoading
    public readonly invitationsGroupIndex$ = this.dataService.invitationsGroupIndex

    private readonly loading = computed(() => this.loadingService.loadingStatesIndex())
    public readonly isLoadingGroups = computed(() => this.loading()[LOADING_KEYS.USER_GROUPS])
    public readonly isLoadingMeets = computed(() => this.loading()[LOADING_KEYS.USER_MEETS])
    public readonly isLoadingHistory = computed(() => this.loading()[LOADING_KEYS.USER_GAMES_HISTORY])

    public readonly greetingName = computed(() => {
        const user = this.currentUser$()
        return user?.displayName || user?.username || ''
    })

    private readonly groupNames = computed(() => new Map(this.userGroups$().map((group) => [group.id, group.name])))
    public groupName(groupId: number): string {
        return this.groupNames().get(groupId) ?? 'Your group'
    }

    /** The next three running or planned game nights across every group, by date (the same rule as Play and Upcoming). */
    public readonly upcomingSessions = computed(() =>
        this.dataService
            .userMeets()
            .filter((meet) => {
                const state = upcomingState(meet)
                return state === 'live' || state === 'planned'
            })
            .sort((a, b) => new Date(a.meetDate).getTime() - new Date(b.meetDate).getTime())
            .slice(0, 3),
    )

    /** The last three sessions you played, newest first. */
    public readonly recentlyPlayed = computed(() =>
        [...this.dataService.userHistory()]
            .sort((a, b) => new Date(b.meetData.meetDate).getTime() - new Date(a.meetData.meetDate).getTime())
            .slice(0, 3),
    )

    public readonly firstGroupId = computed(() => this.userGroups$()[0]?.id ?? null)
    public readonly hasGames = computed(() => this.dataService.userGames().length > 0)
    /** Onboarding tips only make sense until the basics exist. */
    public readonly showGettingStarted = computed(
        () => !this.isLoadingGroups() && !this.userGroupsError() && (this.userGroups$().length === 0 || !this.hasGames()),
    )

    /** Attendees recorded as accounts, group people, or both, each counted once. */
    public peopleCount(record: HistoryRecordType): number {
        return mergeHistoryParticipants(record.attendedBy, record.attendedByPeople).length
    }

    public gameTitles(record: HistoryRecordType): string {
        return record.gamesPlayed.map((game) => game.gameData.titleTranslations.en ?? 'Untitled').join(', ')
    }

    public retryGroups() {
        this.dataService.refreshUserGroups()
        this.dataService.refreshUserMeets()
    }

    public retryInvitations() {
        this.dataService.retryUserInvitations()
    }
}
