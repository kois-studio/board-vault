import { Component, Input } from '@angular/core'
import { CardAccountComponent } from '../card-account/card-account.component'
import { InvitationWithExtraData } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'

@Component({
    standalone: true,
    imports: [CardAccountComponent],
    selector: 'app-card-invitation',
    templateUrl: 'card-invitation.component.html',
})
export class CardInvitationComponent {
    @Input({ required: true }) invitation: null | InvitationWithExtraData = null

    constructor(private readonly dataService: DataService) {}

    get groupGamesCount(): number {
        if (!this.invitation) {
            return 0
        }

        return this.invitation.group.members.reduce((acc, member) => acc + member.games.length, 0)
    }

    acceptInvitation() {
        if (!this.invitation) return
        this.dataService.acceptInvitation(this.invitation.id)
    }

    rejectInvitation() {
        console.log('reject invitation')
    }
}
