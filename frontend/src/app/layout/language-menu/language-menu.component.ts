import { Component, computed, DOCUMENT, ElementRef, inject, input, viewChild } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { NavigationEnd, Router } from '@angular/router'
import { filter, map } from 'rxjs/operators'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { LOCALE_NAMES, type Locale, localeCookie, localeOfPath, localizedUrl, menuLocales, SOURCE_LOCALE } from '../../core/i18n/locales'
import { injectDisclosure } from '../../core/utils/disclosure'

/**
 * The languages the header's menu offers on a page at `pathname`, or none when there is nothing to choose.
 * A development server serves one language at the root (`npm run start:es`), where another language's
 * address does not exist, so the menu needs a page under its language prefix (a build, a preview, production).
 */
export function languageMenuLocales(pathname: string, preview: boolean): Array<Locale> {
    const current = localeOfPath(pathname)
    if (!current) return []
    const locales = menuLocales(current, preview)
    return locales.length > 1 ? locales : []
}

/**
 * The language menu next to the inbox (ADR-0024, disclosure pattern). Each language is a link to the same page
 * under its prefix, a full page load into that language's build; following it remembers the choice in the
 * `bv_lang` cookie for addresses without a prefix.
 */
@Component({
    imports: [IconComponent],
    selector: 'app-language-menu',
    templateUrl: 'language-menu.component.html',
})
export class LanguageMenuComponent {
    private readonly document = inject(DOCUMENT)
    private readonly router = inject(Router)
    private readonly trigger = viewChild<ElementRef<HTMLElement>>('trigger')

    /** What to list, from languageMenuLocales(). */
    readonly locales = input.required<ReadonlyArray<Locale>>()

    public readonly disclosure = injectDisclosure(() => this.trigger())
    public readonly current: Locale = localeOfPath(this.document.location.pathname) ?? SOURCE_LOCALE

    private readonly url = toSignal(
        this.router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            map((event) => event.urlAfterRedirects),
        ),
        { initialValue: this.router.url },
    )

    public readonly links = computed(() =>
        this.locales().map((locale) => ({ locale, name: LOCALE_NAMES[locale], href: localizedUrl(locale, this.url()) })),
    )

    public readonly triggerLabel =
        $localize`:Button in the header that opens the language menu; the placeholder is the current language in itself, such as "Español":Language: ${LOCALE_NAMES[this.current]}:language:`
    public readonly listLabel = $localize`:Name of the list of languages in the header's language menu:Choose a language`

    /** The link goes on to load the page in that language; the cookie makes the choice stick. */
    public choose(locale: Locale): void {
        this.document.cookie = localeCookie(locale, this.document.location.protocol === 'https:')
    }
}
