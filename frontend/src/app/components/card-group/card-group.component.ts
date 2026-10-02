import { Component, computed, inject, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { GroupWithMembersAndGames, InvitationWithAccountsData } from '../../api/api.types'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'
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

    public readonly nextMeetingComputed = computed(() => {
        const upcomingMeets = this.userMeets$()
            .filter((meet) => meet.groupId === this.group().id && (meet.status === 'scheduled' || meet.status === 'active'))
            .sort((a, b) => new Date(a.meetDate).getTime() - new Date(b.meetDate).getTime())

        return upcomingMeets[0] ?? null
    })

    /** Members plus people without an account. */
    public readonly peopleCount = computed(() => this.group().members.length + (this.group().placeholders?.length ?? 0))

    /** Distinct games owned by anyone in the group, members or placeholders. */
    public readonly sharedGameCount = computed(() => {
        const ids = new Set(this.group().members.flatMap((member) => member.games.map((game) => game.id)))
        for (const person of this.group().placeholders ?? []) {
            for (const gameId of person.gameIds) ids.add(gameId)
        }
        return ids.size
    })
}
