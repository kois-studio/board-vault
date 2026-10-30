import { Component, DOCUMENT, inject } from '@angular/core'
import { environment } from '../../../../environments/environment'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { AccountLanguageService } from '../../../core/i18n/account-language.service'
import { LOCALE_NAMES, type Locale, localeOfPath } from '../../../core/i18n/locales'
import { languageMenuLocales } from '../../../layout/language-menu/language-menu.component'

/**
 * Settings → Language (ADR-0024): the same languages as the header's menu, by their own names. Its own section
 * because it is the one preference saved on the account; Appearance keeps the ones saved on the device.
 */
@Component({
    imports: [IconComponent],
    templateUrl: './settings-language.component.html',
})
export class SettingsLanguageComponent {
    private readonly accountLanguage = inject(AccountLanguageService)
    private readonly pathname = inject(DOCUMENT).location.pathname

    /** None when the page has nothing to choose, as on a development server; Settings then hides the section. */
    public readonly languages = languageMenuLocales(this.pathname, environment.previewLocales).map((locale) => ({
        locale,
        name: LOCALE_NAMES[locale],
    }))
    public readonly currentLanguage = localeOfPath(this.pathname)

    public optionClass(chosen: boolean): string {
        return `block cursor-pointer rounded-xl border-2 bg-bv-surface p-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-bv-primary has-[:focus-visible]:ring-offset-2 motion-reduce:transition-none ${
            chosen ? 'border-bv-primary' : 'border-bv-border hover:border-bv-text-muted'
        }`
    }

    public choose(locale: Locale): void {
        if (locale === this.currentLanguage) return
        void this.accountLanguage.choose(locale)
    }
}
