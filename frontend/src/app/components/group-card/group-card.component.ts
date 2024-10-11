import { CommonModule } from '@angular/common'
import { Component, effect, Input } from '@angular/core'
import { Router } from '@angular/router'
import { CardAccountComponent } from "../card-account/card-account.component"
import { DataService } from '../../core/services/data.service'
import type { GroupWithMembersAndGames } from '../../api/api.types'
import type { GameType, InvitationWithAccountsData } from '../../api/api.types'

@Component({
    standalone: true,
    imports: [CommonModule, CardAccountComponent],
    selector: 'app-group-card',
    templateUrl: 'group-card.component.html',
})
export class GroupCardComponent {
    public userData: ReturnType<typeof this.dataService.currentUser> = null
    @Input({ required: true }) group!: GroupWithMembersAndGames
    @Input({ required: true }) invitations: undefined | Array<InvitationWithAccountsData> = []

    constructor(
        private readonly router: Router,
        private readonly dataService: DataService,
    ) {
        effect(() => {
            this.userData = this.dataService.currentUser()
        })
    }

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

    onEditGroup() {
        this.router.navigate(['/group', this.group.id, 'edit'])
    }
    
    onLeaveGroup() {
        this.router.navigate(['/group', this.group.id, 'leave'])
    }

    onNewMeet() {
        this.router.navigate(['/group', this.group.id, 'meet', 'new'])
    }
}
