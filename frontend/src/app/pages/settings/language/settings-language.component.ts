import { Component, DestroyRef, DOCUMENT, ElementRef, inject, viewChildren } from '@angular/core'
import { environment } from '../../../../environments/environment'
import { LanguageSaveErrorComponent } from '../../../components/language-save-error/language-save-error.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { AccountLanguageService } from '../../../core/i18n/account-language.service'
import { LOCALE_NAMES, type Locale, localeOfPath } from '../../../core/i18n/locales'
import { languageMenuLocales } from '../../../layout/language-menu/language-menu.component'

/**
 * Settings → Language (ADR-0024): the same languages as the header's menu, by their own names. Its own section
 * because it is the one preference saved on the account; Appearance keeps the ones saved on the device.
 */
@Component({
    imports: [IconComponent, LanguageSaveErrorComponent],
    templateUrl: './settings-language.component.html',
})
export class SettingsLanguageComponent {
    private readonly accountLanguage = inject(AccountLanguageService)
    private readonly pathname = inject(DOCUMENT).location.pathname
    private readonly radios = viewChildren<ElementRef<HTMLInputElement>>('radio')

    /** The language being saved on the account: the choices wait for it. */
    public readonly saving = this.accountLanguage.saving

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

    constructor() {
        inject(DestroyRef).onDestroy(() => this.accountLanguage.dismissFailure())
    }

    /** Saved, the page loads in that language. Not saved, the page's language is checked again and the reason shows below (#242). */
    public async choose(locale: Locale): Promise<void> {
        if (locale === this.currentLanguage) return
        await this.accountLanguage.choose(locale)
        if (this.accountLanguage.failure()) this.showCurrentLanguage()
    }

    /** The clicked choice checked itself; `[checked]` alone would not undo that, since what it is bound to did not change. */
    private showCurrentLanguage(): void {
        for (const radio of this.radios()) radio.nativeElement.checked = radio.nativeElement.value === this.currentLanguage
    }
}
