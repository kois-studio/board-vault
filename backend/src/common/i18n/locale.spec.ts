import { localeFromAcceptLanguage } from './locale.js'

describe('localeFromAcceptLanguage', () => {
    it('reads the language the frontend sends', () => {
        expect(localeFromAcceptLanguage('es')).toBe('es')
        expect(localeFromAcceptLanguage('de')).toBe('de')
    })

    it('picks the best supported match by quality, then order', () => {
        expect(localeFromAcceptLanguage('pt-BR,pt;q=0.9,fr;q=0.8,en;q=0.7')).toBe('fr')
        expect(localeFromAcceptLanguage('en;q=0.4,it;q=0.9')).toBe('it')
        expect(localeFromAcceptLanguage('es-MX')).toBe('es')
    })

    it('falls back to English', () => {
        expect(localeFromAcceptLanguage(undefined)).toBe('en')
        expect(localeFromAcceptLanguage('')).toBe('en')
        expect(localeFromAcceptLanguage('ja,zh;q=0.5')).toBe('en')
        expect(localeFromAcceptLanguage('es;q=0')).toBe('en')
        expect(localeFromAcceptLanguage('*')).toBe('en')
    })
})
