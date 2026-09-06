import { CommonModule } from '@angular/common'
import { Component, Input, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { GameType, GroupWithMembersAndGames, InvitationWithAccountsData } from '../../api/api.types'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'
import { CardAccountComponent } from '../card-account/card-account.component'

@Component({
    imports: [CommonModule, CardAccountComponent, RouterLink, CustomDatePipe],
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

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public readonly lastMeetingComputed = computed(() => {
        const sortedMeets = this.userMeets$()
            .filter((meet) => meet.groupId === this.group.id && meet.status === 'completed')
            .sort((a, b) => new Date(b.meetDate).getTime() - new Date(a.meetDate).getTime())

        return sortedMeets.length >= 1 ? sortedMeets[0] : null
    })

    public readonly nextMeetingComputed = computed(() => {
        const upcomingMeets = this.userMeets$()
            .filter((meet) => meet.groupId === this.group.id && (meet.status === 'scheduled' || meet.status === 'active'))
            .sort((a, b) => new Date(a.meetDate).getTime() - new Date(b.meetDate).getTime())

        return upcomingMeets[0] ?? null
    })

    @Input({ required: true }) group!: GroupWithMembersAndGames
    @Input({ required: true }) invitations: undefined | Array<InvitationWithAccountsData> = []

    get totalGames(): Array<GameType> {
        // index all games by gameId so we don't duplicate games
        const games: Record<GameType['id'], GameType> = {}

        for (const member of this.group.members) {
            for (const game of member.games) {
                games[game.id] = game
            }
        }

        return Object.values(games)
    }
}
