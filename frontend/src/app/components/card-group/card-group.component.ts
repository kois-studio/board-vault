import { Component, computed, inject, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { GroupWithMembersAndGames, InvitationWithAccountsData } from '../../api/api.types'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'
import { groupGameCount, groupPeopleCount } from '../../core/utils/groupCounts'
import { upcomingState } from '../../core/utils/sessionTiming'
import { CardAccountComponent } from '../card-account/card-account.component'
import { ButtonComponent } from '../ui/button/button.component'
import { IconComponent } from '../ui/icon/icon.component'

@Component({
    imports: [ButtonComponent, CardAccountComponent, RouterLink, CustomDatePipe, IconComponent],
    selector: 'app-card-group',
    templateUrl: 'card-group.component.html',
})
export class CardGroupComponent {
    private readonly dataService = inject(DataService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userMeets$ = this.dataService.userMeets

    readonly group = input.required<GroupWithMembersAndGames>()
    readonly invitations = input.required<undefined | Array<InvitationWithAccountsData>>()

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public readonly lastMeetingComputed = computed(() => {
        const sortedMeets = this.userMeets$()
            .filter((meet) => meet.groupId === this.group().id && meet.status === 'completed')
            .sort((a, b) => new Date(b.meetDate).getTime() - new Date(a.meetDate).getTime())

        return sortedMeets.length >= 1 ? sortedMeets[0] : null
    })

    /** The group's game night in progress, if one was started. */
    public readonly liveMeetingComputed = computed(
        () =>
            this.userMeets$()
                .filter((meet) => meet.groupId === this.group().id && upcomingState(meet) === 'live')
                .sort((a, b) => new Date(b.meetDate).getTime() - new Date(a.meetDate).getTime())[0] ?? null,
    )

    /** The group's next planned night; a night in progress or past its date is not "next". */
    public readonly nextMeetingComputed = computed(
        () =>
            this.userMeets$()
                .filter((meet) => meet.groupId === this.group().id && upcomingState(meet) === 'planned')
                .sort((a, b) => new Date(a.meetDate).getTime() - new Date(b.meetDate).getTime())[0] ?? null,
    )

    /** Members plus people without an account. */
    public readonly peopleCount = computed(() => groupPeopleCount(this.group()))

    /** Distinct games owned by anyone in the group, members or people without an account. */
    public readonly sharedGameCount = computed(() => groupGameCount(this.group()))
}
