import { Component, inject } from '@angular/core'
import { ThemePreference, ThemeService } from '../../../core/services/theme.service'
import { IconComponent } from '../icon/icon.component'

let nextId = 0

/** A compact System · Light · Dark switch (avatar menu, footer). Settings → Appearance has the full version. */
@Component({
    selector: 'app-theme-switch',
    imports: [IconComponent],
    templateUrl: './theme-switch.component.html',
})
export class ThemeSwitchComponent {
    private readonly theme = inject(ThemeService)

    /** Radio names must be unique per instance: the footer and the avatar menu can both be on the page. */
    public readonly name = `theme-switch-${nextId++}`
    public readonly preference = this.theme.preference

    public readonly options: Array<{ value: ThemePreference; label: string; icon: string }> = [
        { value: 'system', label: 'System', icon: 'monitor' },
        { value: 'light', label: 'Light', icon: 'sun' },
        { value: 'dark', label: 'Dark', icon: 'moon' },
    ]

    public choose(preference: ThemePreference): void {
        this.theme.setPreference(preference)
    }
}
