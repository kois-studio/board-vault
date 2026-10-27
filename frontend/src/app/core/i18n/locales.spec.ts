import {
    chooseLocale,
    LOCALE_NAMES,
    localeCookie,
    localeOfPath,
    localeRedirect,
    localizedUrl,
    matchAcceptLanguage,
    menuLocales,
    readCookie,
    SUPPORTED_LOCALES,
} from './locales'

describe('interface languages', () => {
    it('reads the language of a path', () => {
        expect(localeOfPath('/es/groups/1')).toBe('es')
        expect(localeOfPath('/en')).toBe('en')
        expect(localeOfPath('/dashboard')).toBeNull()
        expect(localeOfPath('/')).toBeNull()
        expect(localeOfPath('/pt/x')).toBeNull()
    })

    it('reads one cookie', () => {
        expect(readCookie('a=1; bv_lang=es; b=2', 'bv_lang')).toBe('es')
        expect(readCookie(null, 'bv_lang')).toBeNull()
        expect(readCookie('xbv_lang=es', 'bv_lang')).toBeNull()
    })

    it('matches Accept-Language by quality, then order, among offered languages only', () => {
        const offered = ['en', 'es', 'de'] as const
        expect(matchAcceptLanguage('es-ES,es;q=0.9,en;q=0.8', offered)).toBe('es')
        expect(matchAcceptLanguage('fr-FR,fr;q=0.9,de;q=0.8,en;q=0.7', offered)).toBe('de')
        expect(matchAcceptLanguage('en;q=0.5,es;q=0.9', offered)).toBe('es')
        expect(matchAcceptLanguage('es;q=0', offered)).toBeNull()
        expect(matchAcceptLanguage('ja', offered)).toBeNull()
        expect(matchAcceptLanguage(null, offered)).toBeNull()
        expect(matchAcceptLanguage('*', offered)).toBeNull()
    })

    it('prefers the chosen language, then the browser, then English', () => {
        const offered = ['en', 'es'] as const
        expect(chooseLocale('bv_lang=es', 'en-US', offered)).toBe('es')
        expect(chooseLocale('bv_lang=fr', 'es', offered)).toBe('es')
        expect(chooseLocale(null, 'es-MX', offered)).toBe('es')
        expect(chooseLocale(null, 'ja', offered)).toBe('en')
    })

    it('never offers a language that is not finished', () => {
        expect(chooseLocale('bv_lang=es', 'es', ['en'])).toBe('en')
    })

    it('redirects an address without a prefix and keeps its query', () => {
        expect(localeRedirect(new URL('https://board-vault.com/'), null, null)).toBe('/en/')
        expect(localeRedirect(new URL('https://board-vault.com/register?__clerk_ticket=abc'), null, null)).toBe(
            '/en/register?__clerk_ticket=abc',
        )
        expect(localeRedirect(new URL('https://board-vault.com/es/dashboard'), null, null)).toBeNull()
        expect(localeRedirect(new URL('https://board-vault.com/favicon.ico'), null, null)).toBeNull()
    })

    it('lists the offered languages and the current one, or every language in preview', () => {
        expect(menuLocales('en', false, ['en'])).toEqual(['en'])
        expect(menuLocales('fr', false, ['en'])).toEqual(['en', 'fr'])
        expect(menuLocales('en', false, ['es', 'en'])).toEqual(['en', 'es'])
        expect(menuLocales('es', false, ['en', 'es'])).toEqual(['en', 'es'])
        expect(menuLocales('en', true, ['en'])).toEqual(['en', 'es', 'fr', 'de', 'it'])
    })

    it('names every language in itself', () => {
        expect(SUPPORTED_LOCALES.map((locale) => LOCALE_NAMES[locale])).toEqual(['English', 'Español', 'Français', 'Deutsch', 'Italiano'])
    })

    it('moves the same page, query and fragment to another language', () => {
        expect(localizedUrl('es', '/')).toBe('/es/')
        expect(localizedUrl('de', '/groups/12?tab=games#library')).toBe('/de/groups/12?tab=games#library')
        expect(localizedUrl('it', 'dashboard')).toBe('/it/dashboard')
        expect(localizedUrl('fr', '')).toBe('/fr/')
        expect(localizedUrl('es', '?next=%2Fdashboard')).toBe('/es/?next=%2Fdashboard')
    })

    it('remembers a choice for a year on the whole site, and only over HTTPS when the page is', () => {
        expect(localeCookie('es', true)).toBe('bv_lang=es; Path=/; Max-Age=31536000; SameSite=Lax; Secure')
        expect(localeCookie('fr', false)).toBe('bv_lang=fr; Path=/; Max-Age=31536000; SameSite=Lax')
        expect(chooseLocale(localeCookie('es', true).split(';')[0] ?? null, 'en', ['en', 'es'])).toBe('es')
    })
})
