import { Component, computed, effect, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../api/api'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { DialogDirective } from '../../../components/ui/dialog/dialog.directive'
import { ClerkService } from '../../../core/services/clerk.service'
import { DataService } from '../../../core/services/data.service'
import { LoginService } from '../../../core/services/login.service'

/**
 * How you sign in, and deleting the account. Clerk owns the username, email
 * addresses, password and devices; this page shows them and opens Clerk's
 * panel (ADR-0017). Deletion is ours (ADR-0018): Clerk's own is turned off.
 */
@Component({
    imports: [ButtonComponent, DialogDirective],
    templateUrl: './settings-account.component.html',
})
export class SettingsAccountComponent {
    private readonly clerkService = inject(ClerkService)
    private readonly dataService = inject(DataService)
    private readonly api = inject(Api)
    private readonly loginService = inject(LoginService)

    public readonly clerkIsAvailable = this.clerkService.isAvailable

    // Clerk's values are the source; the account copy can be a few seconds behind a change.
    public readonly username = computed(() => this.clerkService.username() ?? this.dataService.currentUser()?.username ?? '')
    public readonly email = computed(() => this.clerkService.primaryEmail() ?? this.dataService.currentUser()?.email ?? '')

    constructor() {
        // A username changed in Clerk's panel reaches the account by webhook. Show it
        // everywhere straight away instead of waiting for the next reload.
        effect(() => {
            const username = this.clerkService.username()
            const user = this.dataService.currentUser()
            if (username && user && user.username !== username) {
                this.dataService.currentUser.set({ ...user, username })
            }
        })
    }

    public readonly isConfirmingDeletion = signal(false)
    public readonly deletionConfirmation = signal('')
    public readonly isDeleting = signal(false)
    public readonly deletionFailed = signal(false)
    /** Typing the username, in any case, is the confirmation. */
    public readonly canConfirmDeletion = computed(
        () => this.username() !== '' && this.deletionConfirmation().trim().toLowerCase() === this.username().toLowerCase(),
    )

    public openClerkProfile(): void {
        this.clerkService.openUserProfile()
    }

    public startDeletion(): void {
        this.deletionConfirmation.set('')
        this.deletionFailed.set(false)
        this.isConfirmingDeletion.set(true)
    }

    public cancelDeletion(): void {
        if (this.isDeleting()) return
        this.isConfirmingDeletion.set(false)
    }

    public async deleteAccount(): Promise<void> {
        if (!this.canConfirmDeletion() || this.isDeleting()) return
        this.isDeleting.set(true)
        this.deletionFailed.set(false)
        try {
            await firstValueFrom(this.api.deleteAccount())
        } catch {
            this.deletionFailed.set(true)
            this.isDeleting.set(false)
            return
        }
        await this.loginService.leaveAfterAccountDeletion()
    }
}
