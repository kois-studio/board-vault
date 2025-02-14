import { Component, effect } from '@angular/core'
import { CardInvitationComponent } from '../../../../components/card-invitation/card-invitation.component'
import { DataService } from '../../../../core/services/data.service'

@Component({
    imports: [CardInvitationComponent],
    selector: 'app-modal-profile-invitations',
    templateUrl: 'modal-profile-invitations.component.html',
})
export class ModalProfileInvitationsComponent {
    public isVisible = false
    public userInvitations: ReturnType<typeof this.dataService.userInvitations> = []

    constructor(private readonly dataService: DataService) {
        effect(() => {
            this.userInvitations = this.dataService.userInvitations()
        })
    }

    public showDialog() {
        this.isVisible = true
    }

    public hideDialog() {
        this.isVisible = false
    }
}
