import { Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../api/api'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { DialogDirective } from '../../../components/ui/dialog/dialog.directive'
import { ClerkService } from '../../../core/services/clerk.service'
import { DataService } from '../../../core/services/data.service'
import { LoginService } from '../../../core/services/login.service'

/** When to read the account again after Clerk reports a new username: the webhook usually lands within seconds. */
const USERNAME_SYNC_DELAYS_MS = [1_500, 5_000, 15_000]

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
    /** Clerk has a newer username that has not reached Board Vault after a few reads. */
    public readonly usernameBehind = signal(false)
    private usernameSyncFor: string | null = null
    private usernameSyncTimer: ReturnType<typeof setTimeout> | null = null

    constructor() {
        // A username changed in Clerk's panel reaches the account by webhook, a moment later. Read the
        // account again until it arrives, so every page shows what Board Vault really has. Copying
        // Clerk's value into the account would show a name the server may never take (one already in use).
        effect(() => {
            const wanted = this.clerkService.username()
            const current = this.accountUsername()
            untracked(() => {
                if (!wanted || !current || wanted === current) {
                    this.stopUsernameSync()
                    this.usernameBehind.set(false)
                } else if (this.usernameSyncFor !== wanted) {
                    this.startUsernameSync(wanted)
                }
            })
        })
        inject(DestroyRef).onDestroy(() => this.stopUsernameSync())
    }

    private startUsernameSync(wanted: string): void {
        this.stopUsernameSync()
        this.usernameSyncFor = wanted
        this.usernameBehind.set(false)

        const read = (attempt: number) => {
            this.usernameSyncTimer = setTimeout(async () => {
                await this.dataService.refreshCurrentUser()
                // Arrived (the effect stops the sync), or Clerk changed again (a new sync runs).
                if (this.usernameSyncFor !== wanted || this.accountUsername() === wanted) return
                if (attempt + 1 < USERNAME_SYNC_DELAYS_MS.length) read(attempt + 1)
                else this.usernameBehind.set(true)
            }, USERNAME_SYNC_DELAYS_MS[attempt])
        }
        read(0)
    }

    private stopUsernameSync(): void {
        if (this.usernameSyncTimer) clearTimeout(this.usernameSyncTimer)
        this.usernameSyncTimer = null
        this.usernameSyncFor = null
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
