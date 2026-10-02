import { Component, input, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { InvitationWithExtraData } from '../../api/api.types'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'
import { CardAccountComponent } from '../card-account/card-account.component'
import { IconComponent } from '../ui/icon/icon.component'

@Component({
    imports: [CardAccountComponent, CustomDatePipe, IconComponent],
    selector: 'app-card-invitation',
    templateUrl: 'card-invitation.component.html',
})
export class CardInvitationComponent {
    readonly invitation = input.required<null | InvitationWithExtraData>()
    public isLoading = false
    public isConfirmingDecline = false
    public readonly actionError = signal<string | null>(null)

    constructor(private readonly dataService: DataService) {}

    async acceptInvitation() {
        const invitation = this.invitation()
        if (!invitation || this.isLoading) return
        this.isConfirmingDecline = false
        this.actionError.set(null)
        this.isLoading = true
        try {
            await firstValueFrom(this.dataService.acceptInvitation(invitation.id))
        } catch {
            this.actionError.set(
                'We could not accept this invitation. It may have expired or the group may no longer be available. Try again or refresh your invitations.',
            )
        } finally {
            this.isLoading = false
        }
    }

    async rejectInvitation() {
        const invitation = this.invitation()
        if (!invitation || this.isLoading) return

        if (!this.isConfirmingDecline) {
            this.isConfirmingDecline = true
            return
        }

        this.actionError.set(null)
        this.isLoading = true
        try {
            await firstValueFrom(this.dataService.rejectInvitation(invitation.id))
        } catch {
            this.actionError.set('We could not decline this invitation right now. Try again or refresh your invitations.')
        } finally {
            this.isLoading = false
        }
    }

    public refreshInvitations(): void {
        this.actionError.set(null)
        this.dataService.retryUserInvitations()
    }
}
