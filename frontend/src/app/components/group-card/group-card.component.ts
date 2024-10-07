import { Component, Input } from '@angular/core'
import { Router } from '@angular/router'
import type { GameType } from '../../types/game.type'
import type { GroupWithMembersType } from '../../types/group-with-members.type'
import type { GroupMemberType } from '../../types/user.type'
import type { InvitationType } from '../../types/invitation.type'
import { ImageProfileComponent } from '../image-profile/image-profile.component'

@Component({
    standalone: true,
    imports: [ImageProfileComponent],
    selector: 'app-group-card',
    templateUrl: 'group-card.component.html',
})
export class GroupCardComponent {
    @Input({ required: true }) group!: GroupWithMembersType
    @Input({ required: true }) members: Array<GroupMemberType> = []
    @Input({ required: true }) gamesIndex: Record<GroupMemberType['accountId'], Array<GameType>> = {}
    @Input({ required: true }) invitations: Array<InvitationType> = []

    constructor(private readonly router: Router) {}

    get totalGames(): Array<GameType> {
        // index all games by gameId so we don't duplicate games
        const games: Record<GameType['id'], GameType> = {}

        for (const [accountId, gamesList] of Object.entries(this.gamesIndex)) {
            for (const game of gamesList) {
                games[game.id] = game
            }
        }

        return Object.values(games)
    }

    onEditGroup() {
        this.router.navigate(['/group', this.group.groupId, 'edit'])
    }
}
