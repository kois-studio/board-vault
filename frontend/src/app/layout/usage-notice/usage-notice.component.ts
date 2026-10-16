import { Component, effect, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import { ToastService } from '../../components/toast/toast.service'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { SwitchComponent } from '../../components/ui/switch/switch.component'
import { LoginService } from '../../core/services/login.service'

/**
 * Tells everyone once about usage statistics, with the switch right there (#158, ADR-0021). It
 * shows until the account answers: flipping the switch, "Got it", or the switch in Settings.
 * Leaving it on and turning it off take the same single tap, and neither gets a guilt trip.
 */
@Component({
    selector: 'app-usage-notice',
    imports: [RouterLink, ButtonComponent, SwitchComponent],
    templateUrl: './usage-notice.component.html',
})
export class UsageNoticeComponent {
    private readonly api = inject(Api)
    private readonly loginService = inject(LoginService)
    private readonly toastService = inject(ToastService)

    /** The switch, while the card shows; null when there is nothing to show. */
    readonly usageAnalytics = signal<boolean | null>(null)
    /** True once the switch was flipped here, so the card says thanks for the choice. */
    readonly answered = signal(false)
    readonly saving = signal(false)

    private asked = false

    constructor() {
        effect(() => {
            if (this.loginService.isAuthenticated() && !this.asked) {
                this.asked = true
                void this.load()
            }
        })
    }

    async toggle(next: boolean): Promise<void> {
        if (await this.save(next)) this.answered.set(true)
    }

    /** Closing it keeps the switch as it is, which answers the notice too. */
    async close(): Promise<void> {
        const current = this.usageAnalytics()

        if (current === null) return
        if (this.answered() || (await this.save(current))) this.usageAnalytics.set(null)
    }

    private async load(): Promise<void> {
        try {
            const settings = await firstValueFrom(this.api.getPrivacySettings())

            if (!settings.noticeAnswered) this.usageAnalytics.set(settings.usageAnalytics)
        } catch {
            // Not now; it asks again on the next visit.
        }
    }

    private async save(usageAnalytics: boolean): Promise<boolean> {
        this.saving.set(true)
        try {
            this.usageAnalytics.set((await firstValueFrom(this.api.updatePrivacySettings({ usageAnalytics }))).usageAnalytics)
            return true
        } catch {
            this.toastService.error('Could not save your choice. Try again.')
            return false
        } finally {
            this.saving.set(false)
        }
    }
}
