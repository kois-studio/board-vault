import { Component, effect } from '@angular/core';
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