import { Component, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../api/api'
import { ToastService } from '../../../components/toast/toast.service'

/** Settings → Privacy: whether what you do counts towards usage statistics (ADR-0021). */
@Component({
    templateUrl: './settings-privacy.component.html',
})
export class SettingsPrivacyComponent {
    private readonly api = inject(Api)
    private readonly toastService = inject(ToastService)

    readonly usageAnalytics = signal<boolean | null>(null)
    readonly saving = signal(false)
    readonly failed = signal(false)

    constructor() {
        void this.load()
    }

    async load(): Promise<void> {
        this.failed.set(false)
        try {
            this.usageAnalytics.set((await firstValueFrom(this.api.getPrivacySettings())).usageAnalytics)
        } catch {
            this.failed.set(true)
        }
    }

    async toggle(): Promise<void> {
        const next = !this.usageAnalytics()
        this.saving.set(true)
        try {
            this.usageAnalytics.set((await firstValueFrom(this.api.updatePrivacySettings({ usageAnalytics: next }))).usageAnalytics)
            this.toastService.success(
                next ? 'Thanks: what you do counts towards usage statistics again.' : 'Done: nothing you do is counted from now on.',
            )
        } catch {
            this.toastService.error('Could not save your choice. Try again.')
        } finally {
            this.saving.set(false)
        }
    }
}
