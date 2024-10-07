import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'
import { Router } from '@angular/router'
import type { GroupWithMembersAndGames } from '../../api/api.types'
import type { GameType, InvitationWithAccountsData } from '../../api/api.types'
import { ImageProfileComponent } from '../image-profile/image-profile.component'

@Component({
    standalone: true,
    imports: [ImageProfileComponent, CommonModule],
    selector: 'app-group-card',
    templateUrl: 'group-card.component.html',
})
export class GroupCardComponent {
    @Input({ required: true }) group!: GroupWithMembersAndGames
    @Input({ required: true }) invitations: undefined | Array<InvitationWithAccountsData> = []

    constructor(private readonly router: Router) {}

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

    onNewMeet() {
        this.router.navigate(['/group', this.group.id, 'meet', 'new'])
    }
}
