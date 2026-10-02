import { Component, inject, signal } from '@angular/core'
import { CardInvitationComponent } from '../../../../components/card-invitation/card-invitation.component'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { DialogDirective } from '../../../../components/ui/dialog/dialog.directive'
import { IconComponent } from '../../../../components/ui/icon/icon.component'
import { DataService } from '../../../../core/services/data.service'

@Component({
    imports: [ButtonComponent, CardInvitationComponent, DialogDirective, IconComponent],
    selector: 'app-modal-profile-invitations',
    templateUrl: 'modal-profile-invitations.component.html',
})
export class ModalProfileInvitationsComponent {
    private readonly dataService = inject(DataService)
    public readonly isVisible = signal(false)
    public readonly userInvitations = this.dataService.userInvitations
    public readonly isLoading = this.dataService.userInvitationsLoading
    public readonly hasError = this.dataService.userInvitationsError
    public showDialog() {
        this.isVisible.set(true)
    }

    public hideDialog() {
        this.isVisible.set(false)
    }

    public retry() {
        this.dataService.retryUserInvitations()
    }
}
