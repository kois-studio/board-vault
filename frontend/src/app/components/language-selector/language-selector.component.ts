import { Component } from '@angular/core'
import { IconComponent } from '../ui/icon/icon.component'
import { language_titles } from './translations'

@Component({
    imports: [IconComponent],
    selector: 'language-selector',
    templateUrl: 'language-selector.component.html',
})
export class LanguageSelectorComponent {
    public currentLanguage = 'English'
    public isListVisible = false
    public language_titles = Object.keys(language_titles)

    onClick() {
        // toggle the dropdown
        this.isListVisible = !this.isListVisible
    }

    getLabel(lang_key: string) {
        return language_titles[lang_key as keyof typeof language_titles]
    }

    redirectToLocale(locale: string) {
        console.log('Redirecting to locale:', locale)
        const currentLang = window.location.pathname.split('/')[1]

        if (currentLang !== locale) {
            window.location.href = window.location.pathname.replace(`/${currentLang}`, `/${locale}`)
        } else {
            // close the dropdown
            this.isListVisible = !this.isListVisible
        }
    }
}
