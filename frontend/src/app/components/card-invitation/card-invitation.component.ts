import { Component, input, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { InvitationWithExtraData } from '../../api/api.types'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'
import { CardAccountComponent } from '../card-account/card-account.component'
import { ButtonComponent } from '../ui/button/button.component'
import { IconComponent } from '../ui/icon/icon.component'

@Component({
    imports: [ButtonComponent, CardAccountComponent, CustomDatePipe, IconComponent],
    selector: 'app-card-invitation',
    templateUrl: 'card-invitation.component.html',
})
export class CardInvitationComponent {
    readonly invitation = input.required<null | InvitationWithExtraData>()
    public readonly isLoading = signal(false)
    public readonly isConfirmingDecline = signal(false)
    public readonly actionError = signal<string | null>(null)

    constructor(private readonly dataService: DataService) {}

    public acceptLabel(group: string): string {
        return $localize`:Name of the Accept button on a group invitation in the inbox:Accept invitation to ${group}:group:`
    }

    public declineLabel(group: string): string {
        return $localize`:Name of the Decline button on a group invitation in the inbox:Decline invitation to ${group}:group:`
    }

    async acceptInvitation() {
        const invitation = this.invitation()
        if (!invitation || this.isLoading()) return
        this.isConfirmingDecline.set(false)
        this.actionError.set(null)
        this.isLoading.set(true)
        try {
            await firstValueFrom(this.dataService.acceptInvitation(invitation.id))
        } catch {
            this.actionError.set(
                $localize`:Error on a group invitation in the inbox when accepting it failed:We could not accept this invitation. It may have expired or the group may no longer be available. Try again or refresh your invitations.`,
            )
        } finally {
            this.isLoading.set(false)
        }
    }

    async rejectInvitation() {
        const invitation = this.invitation()
        if (!invitation || this.isLoading()) return

        if (!this.isConfirmingDecline()) {
            this.isConfirmingDecline.set(true)
            return
        }

        this.actionError.set(null)
        this.isLoading.set(true)
        try {
            await firstValueFrom(this.dataService.rejectInvitation(invitation.id))
        } catch {
            this.actionError.set(
                $localize`:Error on a group invitation in the inbox when declining it failed:We could not decline this invitation right now. Try again or refresh your invitations.`,
            )
        } finally {
            this.isLoading.set(false)
        }
    }

    public refreshInvitations(): void {
        this.actionError.set(null)
        this.dataService.retryUserInvitations()
    }
}
