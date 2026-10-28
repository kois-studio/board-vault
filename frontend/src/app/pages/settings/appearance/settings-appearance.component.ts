import { NgTemplateOutlet } from '@angular/common'
import { Component, DOCUMENT, inject } from '@angular/core'
import { environment } from '../../../../environments/environment'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { AccountLanguageService } from '../../../core/i18n/account-language.service'
import { LOCALE_NAMES, type Locale, localeOfPath } from '../../../core/i18n/locales'
import { TextSize, ThemePalette, ThemePreference, ThemeService } from '../../../core/services/theme.service'
import { languageMenuLocales } from '../../../layout/language-menu/language-menu.component'

type Option<T> = { value: T; label: string; description: string; icon?: string }

@Component({
    imports: [IconComponent, NgTemplateOutlet],
    templateUrl: './settings-appearance.component.html',
})
export class SettingsAppearanceComponent {
    private readonly theme = inject(ThemeService)
    private readonly accountLanguage = inject(AccountLanguageService)
    private readonly pathname = inject(DOCUMENT).location.pathname

    /** The same languages as the header's menu, by their own names; none when the page has nothing to choose. */
    public readonly languages = languageMenuLocales(this.pathname, environment.previewLocales).map((locale) => ({
        locale,
        name: LOCALE_NAMES[locale],
    }))
    public readonly currentLanguage = localeOfPath(this.pathname)

    public readonly preference = this.theme.preference
    public readonly palette = this.theme.palette
    public readonly textSize = this.theme.textSize

    public readonly schemes: Array<Option<ThemePreference>> = [
        {
            value: 'system',
            label: $localize`:Color scheme option in the Appearance settings that follows the device:System`,
            icon: 'monitor',
            description: $localize`:Description of the System color scheme in the Appearance settings:Match your device, and switch when it does.`,
        },
        {
            value: 'light',
            label: $localize`:Color scheme option in the Appearance settings:Light`,
            icon: 'sun',
            description: $localize`:Description of the Light color scheme in the Appearance settings:Light background, always.`,
        },
        {
            value: 'dark',
            label: $localize`:Color scheme option in the Appearance settings:Dark`,
            icon: 'moon',
            description: $localize`:Description of the Dark color scheme in the Appearance settings:Dark background, always.`,
        },
    ]

    public readonly palettes: Array<Option<ThemePalette>> = [
        // Ciruela is the name of Board Vault's own theme, the same in every language.
        {
            value: 'ciruela',
            label: 'Ciruela',
            description: $localize`:Description of the Ciruela theme, Board Vault's own plum colors, in the Appearance settings:Plum and lilac. The Board Vault colors.`,
        },
        {
            value: 'felt',
            label: $localize`:Name of a green color theme in the Appearance settings, like the felt of a card table:Felt`,
            description: $localize`:Description of the Felt theme in the Appearance settings:The green of a card table.`,
        },
        {
            value: 'harbor',
            label: $localize`:Name of a blue color theme in the Appearance settings, like a harbour by the sea:Harbor`,
            description: $localize`:Description of the Harbor theme in the Appearance settings:Deep sea blue.`,
        },
        {
            value: 'graphite',
            label: $localize`:Name of a gray color theme in the Appearance settings:Graphite`,
            description: $localize`:Description of the Graphite theme in the Appearance settings:Quiet grays.`,
        },
    ]

    /** `sample` is the size of the "Aa" preview in pixels: the root size each option sets (styles.css). */
    public readonly textSizes: Array<Option<TextSize> & { sample: number }> = [
        {
            value: 'default',
            label: $localize`:Text size option in the Appearance settings:Default`,
            description: $localize`:Description of the Default text size in the Appearance settings:The standard size.`,
            sample: 16,
        },
        {
            value: 'large',
            label: $localize`:Text size option in the Appearance settings:Large`,
            description: $localize`:Description of the Large text size in the Appearance settings:A little bigger.`,
            sample: 18,
        },
        {
            value: 'larger',
            label: $localize`:Text size option in the Appearance settings, bigger than Large:Larger`,
            description: $localize`:Description of the Larger text size in the Appearance settings:Bigger still.`,
            sample: 20,
        },
    ]

    public optionClass(chosen: boolean): string {
        return `block cursor-pointer rounded-xl border-2 bg-bv-surface p-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-bv-primary has-[:focus-visible]:ring-offset-2 motion-reduce:transition-none ${
            chosen ? 'border-bv-primary' : 'border-bv-border hover:border-bv-text-muted'
        }`
    }

    public chooseLanguage(locale: Locale): void {
        if (locale === this.currentLanguage) return
        void this.accountLanguage.choose(locale)
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
