import { chooseLocale, localeOfPath, localeRedirect, matchAcceptLanguage, readCookie } from './locales'

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
})
