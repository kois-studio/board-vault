import { Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core'
import { CardInvitationComponent } from '../../../../components/card-invitation/card-invitation.component'
import { IconComponent } from '../../../../components/ui/icon/icon.component'
import { DataService } from '../../../../core/services/data.service'

@Component({
    imports: [CardInvitationComponent, IconComponent],
    selector: 'app-modal-profile-invitations',
    templateUrl: 'modal-profile-invitations.component.html',
})
export class ModalProfileInvitationsComponent {
    private readonly dataService = inject(DataService)
    public isVisible = false
    public readonly userInvitations = this.dataService.userInvitations
    public readonly isLoading = this.dataService.userInvitationsLoading
    public readonly hasError = this.dataService.userInvitationsError
    private previousActiveElement: HTMLElement | null = null
    private previousBodyOverflow = ''
    @ViewChild('dialogClose') private dialogClose?: ElementRef<HTMLButtonElement>

    public showDialog() {
        this.previousActiveElement = document.activeElement as HTMLElement | null
        this.previousBodyOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        this.isVisible = true
        setTimeout(() => this.dialogClose?.nativeElement.focus())
    }

    public hideDialog() {
        this.isVisible = false
        document.body.style.overflow = this.previousBodyOverflow
        setTimeout(() => this.previousActiveElement?.focus())
    }

    @HostListener('document:keydown.escape')
    public onEscape(): void {
        if (this.isVisible) this.hideDialog()
    }

    public trapFocus(event: KeyboardEvent): void {
        if (event.key !== 'Tab') return
        const dialog = event.currentTarget as HTMLElement
        const focusable = Array.from(
            dialog.querySelectorAll<HTMLElement>('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'),
        )
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
        }
    }

    public retry() {
        this.dataService.retryUserInvitations()
    }
}
