import { Component, Input } from '@angular/core'
import { CardAccountComponent } from '../card-account/card-account.component'
import { InvitationWithExtraData } from '../../api/api.types'

@Component({
    standalone: true,
    imports: [CardAccountComponent],
    selector: 'app-card-invitation',
    templateUrl: 'card-invitation.component.html',
})
export class CardInvitationComponent {
    @Input({ required: true }) invitation: null | InvitationWithExtraData = null

    get groupGamesCount(): number {
        if (!this.invitation) {
            return 0
        }

        return this.invitation.group.members.reduce((acc, member) => acc + member.games.length, 0)
    }

    acceptInvitation() {
        console.log('accept invitation')
    }

    rejectInvitation() {
        console.log('reject invitation')
    }
}
