import { Component, Input } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { InvitationWithExtraData } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { CardAccountComponent } from '../card-account/card-account.component'

@Component({
    imports: [CardAccountComponent],
    selector: 'app-card-invitation',
    templateUrl: 'card-invitation.component.html',
})
export class CardInvitationComponent {
    @Input({ required: true }) invitation: null | InvitationWithExtraData = null
    public isLoading = false

    constructor(private readonly dataService: DataService) {}

    async acceptInvitation() {
        if (!this.invitation || this.isLoading) return
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
