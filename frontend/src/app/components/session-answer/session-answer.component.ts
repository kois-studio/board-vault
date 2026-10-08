import { Component, inject, input, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import type { AccountMeetType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { myRsvpLabel } from '../../core/utils/rsvp'
import { ToastService } from '../toast/toast.service'
import { IconComponent } from '../ui/icon/icon.component'

/** Your answer to a game night on a list card: the two buttons while it waits for you, then the answer you gave. */
@Component({
    imports: [IconComponent],
    selector: 'app-session-answer',
    templateUrl: 'session-answer.component.html',
})
export class SessionAnswerComponent {
    private readonly dataService = inject(DataService)
    private readonly toastService = inject(ToastService)

    readonly session = input.required<AccountMeetType>()
    readonly isSaving = signal(false)

    label(): string | null {
        const status = this.session().myRsvpStatus
        return status ? myRsvpLabel(status) : null
    }

    /** Only invitees answer, and only while the night can still change. */
    canAnswer(): boolean {
        const { myRsvpStatus, status } = this.session()
        return myRsvpStatus !== null && (status === 'scheduled' || status === 'active')
    }

    async answer(rsvpStatus: 'accepted' | 'declined'): Promise<void> {
        if (this.isSaving() || this.session().myRsvpStatus === rsvpStatus) return
        this.isSaving.set(true)
        try {
            await firstValueFrom(this.dataService.answerSession(this.session().id, rsvpStatus))
        } catch {
            this.toastService.error('Your answer could not be saved. Try again.')
        } finally {
            this.isSaving.set(false)
        }
    }
}
