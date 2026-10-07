import { NgTemplateOutlet } from '@angular/common'
import { Component, inject } from '@angular/core'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { TextSize, ThemePalette, ThemePreference, ThemeService } from '../../../core/services/theme.service'

type Option<T> = { value: T; label: string; description: string; icon?: string }

@Component({
    imports: [IconComponent, NgTemplateOutlet],
    templateUrl: './settings-appearance.component.html',
})
export class SettingsAppearanceComponent {
    private readonly theme = inject(ThemeService)

    public readonly preference = this.theme.preference
    public readonly palette = this.theme.palette
    public readonly textSize = this.theme.textSize

    public readonly schemes: Array<Option<ThemePreference>> = [
        { value: 'system', label: 'System', icon: 'monitor', description: 'Match your device, and switch when it does.' },
        { value: 'light', label: 'Light', icon: 'sun', description: 'Light background, always.' },
        { value: 'dark', label: 'Dark', icon: 'moon', description: 'Dark background, always.' },
    ]

    public readonly palettes: Array<Option<ThemePalette>> = [
        { value: 'ciruela', label: 'Ciruela', description: 'Plum and lilac. The Board Vault colors.' },
        { value: 'felt', label: 'Felt', description: 'The green of a card table.' },
        { value: 'harbor', label: 'Harbor', description: 'Deep sea blue.' },
        { value: 'graphite', label: 'Graphite', description: 'Quiet grays.' },
    ]

    /** `sample` is the size of the "Aa" preview in pixels: the root size each option sets (styles.css). */
    public readonly textSizes: Array<Option<TextSize> & { sample: number }> = [
        { value: 'default', label: 'Default', description: 'The standard size.', sample: 16 },
        { value: 'large', label: 'Large', description: 'A little bigger.', sample: 18 },
        { value: 'larger', label: 'Larger', description: 'Bigger still.', sample: 20 },
    ]

    public optionClass(chosen: boolean): string {
        return `block cursor-pointer rounded-xl border-2 bg-bv-surface p-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-bv-primary has-[:focus-visible]:ring-offset-2 motion-reduce:transition-none ${
            chosen ? 'border-bv-primary' : 'border-bv-border hover:border-bv-text-muted'
        }`
    }

    public chooseScheme(preference: ThemePreference): void {
        this.theme.setPreference(preference)
    }

    public choosePalette(palette: ThemePalette): void {
        this.theme.setPalette(palette)
    }

    public chooseTextSize(size: TextSize): void {
        this.theme.setTextSize(size)
    }
}
