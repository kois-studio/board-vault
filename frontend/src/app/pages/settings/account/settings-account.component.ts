import { Component, computed, effect, inject, signal, untracked } from '@angular/core'
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

    /** The username Board Vault has; groups invite and see you by it. */
    public readonly accountUsername = computed(() => this.dataService.currentUser()?.username ?? null)
    /**
     * Copying a username changed in Clerk: `taken` when another account has it, `failed` when it
     * could not be copied now. Idle otherwise, including while the copy runs.
     */
    public readonly usernameSync = signal<'idle' | 'taken' | 'failed'>('idle')
    private usernameSyncFor: string | null = null

    constructor() {
        // A username changed in Clerk's panel is copied to the account right away, read by the API from
        // Clerk (ADR-0017), instead of waiting for the webhook, which never reaches a local API. Copying
        // Clerk's value here would show a name the server may never take (one already in use).
        effect(() => {
            const wanted = this.clerkService.username()
            const current = this.accountUsername()
            untracked(() => {
                if (!wanted || !current || wanted === current) {
                    this.usernameSyncFor = null
                    this.usernameSync.set('idle')
                } else if (this.usernameSyncFor !== wanted) {
                    void this.syncUsername(wanted)
                }
            })
        })
    }

    private async syncUsername(wanted: string): Promise<void> {
        this.usernameSyncFor = wanted
        this.usernameSync.set('idle')
        const result = await this.dataService.syncFromClerk()
        // Clerk changed again meanwhile: that change runs its own sync.
        if (this.usernameSyncFor !== wanted || this.accountUsername() === wanted) return
        this.usernameSync.set(result?.username === 'taken' ? 'taken' : 'failed')
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
