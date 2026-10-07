import { Component, computed, effect, inject } from '@angular/core'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ClerkService } from '../../../core/services/clerk.service'
import { DataService } from '../../../core/services/data.service'

/**
 * How you sign in. Clerk owns the username, email addresses, password and
 * devices; this page shows them and opens Clerk's panel (ADR-0017).
 */
@Component({
    imports: [ButtonComponent],
    templateUrl: './settings-account.component.html',
})
export class SettingsAccountComponent {
    private readonly clerkService = inject(ClerkService)
    private readonly dataService = inject(DataService)

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

    public openClerkProfile(): void {
        this.clerkService.openUserProfile()
    }
}
