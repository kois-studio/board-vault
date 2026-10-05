import { NgTemplateOutlet } from '@angular/common'
import { Component, inject } from '@angular/core'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { ThemePreference, ThemeService } from '../../../core/services/theme.service'

@Component({
    imports: [IconComponent, NgTemplateOutlet],
    templateUrl: './settings-appearance.component.html',
})
export class SettingsAppearanceComponent {
    private readonly theme = inject(ThemeService)

    public readonly preference = this.theme.preference

    public readonly options: Array<{ value: ThemePreference; label: string; icon: string; description: string }> = [
        { value: 'system', label: 'System', icon: 'monitor', description: 'Match your device, and switch when it does.' },
        { value: 'light', label: 'Light', icon: 'sun', description: 'Lilac background, always.' },
        { value: 'dark', label: 'Dark', icon: 'moon', description: 'Plum charcoal background, always.' },
    ]

    public choose(preference: ThemePreference): void {
        this.theme.setPreference(preference)
    }
}
