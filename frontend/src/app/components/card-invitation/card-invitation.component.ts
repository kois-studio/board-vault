import { Component, Input } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { InvitationWithExtraData } from '../../api/api.types'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'
import { CardAccountComponent } from '../card-account/card-account.component'

@Component({
    imports: [CardAccountComponent, CustomDatePipe],
    selector: 'app-card-invitation',
    templateUrl: 'card-invitation.component.html',
})
export class CardInvitationComponent {
    @Input({ required: true }) invitation: null | InvitationWithExtraData = null
    public isLoading = false
    public isConfirmingDecline = false

    constructor(private readonly dataService: DataService) {}

    async acceptInvitation() {
        if (!this.invitation || this.isLoading) return
        this.isConfirmingDecline = false
        this.isLoading = true
        try {
            await firstValueFrom(this.dataService.acceptInvitation(this.invitation.id))
        } catch {
            // DataService presents the failure and leaves the invitation available for retry.
        } finally {
            this.isLoading = false
        }
    }

    async rejectInvitation() {
        if (!this.invitation || this.isLoading) return

        if (!this.isConfirmingDecline) {
            this.isConfirmingDecline = true
            return
        }

        this.isLoading = true
        try {
            await firstValueFrom(this.dataService.rejectInvitation(this.invitation.id))
        } catch {
            // DataService presents the failure and leaves the invitation available for retry.
        } finally {
            this.isLoading = false
        }
    }
}
