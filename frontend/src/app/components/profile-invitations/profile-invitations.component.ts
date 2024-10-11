import { Component, effect, OnInit } from '@angular/core';
import { DataService } from '../../core/services/data.service';
import { CardInvitationComponent } from "../card-invitation/card-invitation.component";

@Component({
    standalone: true,
    imports: [CardInvitationComponent],
    selector: 'app-profile-invitations',
    templateUrl: 'profile-invitations.component.html'
})

export class ProfileInvitationsComponent {
    public isVisible = false
    public invitationsReceived: ReturnType<typeof this.dataService.invitationsReceived> = []

    constructor(private readonly dataService: DataService) {
        effect(() => {
            this.invitationsReceived = this.dataService.invitationsReceived()
        })
    }

    public showDialog() {
        this.isVisible = true
    }

    public hideDialog() {
        this.isVisible = false
    }
}