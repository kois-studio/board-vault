import { Component, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../api/api'
import { ToastService } from '../../../components/toast/toast.service'
import { SwitchComponent } from '../../../components/ui/switch/switch.component'

/** Settings → Privacy: whether what you do counts towards usage statistics (ADR-0021). */
@Component({
    imports: [SwitchComponent],
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
                next
                    ? $localize`:Toast after turning usage statistics back on in the Privacy settings:Thanks: what you do counts towards usage statistics again.`
                    : $localize`:Toast after turning usage statistics off in the Privacy settings:Done: nothing you do is counted from now on.`,
            )
        } catch {
            this.toastService.error(
                $localize`:Toast when the usage statistics choice in the Privacy settings could not be saved:Could not save your choice. Try again.`,
            )
        } finally {
            this.saving.set(false)
        }
    }
}
