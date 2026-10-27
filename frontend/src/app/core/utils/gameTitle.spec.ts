import { GameTitlePipe } from '../pipes/game-title.pipe'
import { gameTitle, gameTitleLanguage, otherGameTitles } from './gameTitle'

describe('gameTitle', () => {
    const codenames = { title: 'Codenames', titleTranslations: { en: 'Codenames', es: 'Código Secreto' } }

    it('uses the title in the page’s language, then the English one, then the stored one', () => {
        expect(gameTitle(codenames)).toBe('Codenames')
        expect(gameTitle(codenames, 'es')).toBe('Código Secreto')
        expect(gameTitle(codenames, 'de')).toBe('Codenames')
        expect(gameTitle({ title: 'Catan', titleTranslations: { en: 'Catan (EN)' } })).toBe('Catan (EN)')
        expect(gameTitle({ title: 'Catan', titleTranslations: { en: '' } })).toBe('Catan')
    })

    it('names a game the catalogue has no title for, instead of leaving it blank', () => {
        expect(gameTitle({ title: '', titleTranslations: { en: '' } })).toBe('Untitled game')
        expect(gameTitle({})).toBe('Untitled game')
        expect(new GameTitlePipe().transform({ title: null, titleTranslations: null })).toBe('Untitled game')
    })

    it('says when the title shown is in another language than the page', () => {
        expect(gameTitleLanguage(codenames, 'es')).toBeNull()
        expect(gameTitleLanguage(codenames, 'de')).toBe('en')
        expect(gameTitleLanguage(codenames, 'en')).toBeNull()
        expect(gameTitleLanguage({ title: 'Catan' }, 'fr')).toBeNull()
    })
})

describe('gameTitle with a title the API resolved', () => {
    const german = { title: 'Bärenpark', titleLanguage: 'de', titleTranslations: { de: 'Bärenpark' } }
    const codenames = { title: 'Código Secreto', titleLanguage: 'es', titleTranslations: { en: 'Codenames', es: 'Código Secreto' } }

    it('shows the resolved title, whatever editions the game has', () => {
        expect(gameTitle(german, 'en')).toBe('Bärenpark')
        expect(gameTitle(german, 'es')).toBe('Bärenpark')
        expect(gameTitle(codenames, 'es')).toBe('Código Secreto')
        expect(new GameTitlePipe().transform(german)).toBe('Bärenpark')
    })

    it('takes the language of the resolved title, null when it is the page’s', () => {
        expect(gameTitleLanguage(german, 'es')).toBe('de')
        expect(gameTitleLanguage(codenames, 'es')).toBeNull()
        expect(gameTitleLanguage(codenames, 'en')).toBe('es')
    })

    it('falls back to the editions when the API sent no language or an empty title', () => {
        expect(gameTitle({ title: 'Codenames', titleTranslations: { en: 'Codenames (EN)' } }, 'en')).toBe('Codenames (EN)')
        expect(gameTitle({ title: '', titleLanguage: 'en', titleTranslations: { en: 'Codenames' } }, 'en')).toBe('Codenames')
    })

    it('still lists the other editions for "also known as"', () => {
        expect(otherGameTitles(codenames, 'es')).toEqual([{ title: 'Codenames', lang: 'en' }])
    })
})

describe('otherGameTitles', () => {
    it('lists the titles not shown, once each, with their language', () => {
        const game = { titleTranslations: { en: 'Codenames', es: 'Código Secreto' } }

        expect(otherGameTitles(game, 'es')).toEqual([{ title: 'Codenames', lang: 'en' }])
        expect(otherGameTitles(game, 'en')).toEqual([{ title: 'Código Secreto', lang: 'es' }])
        expect(otherGameTitles({ titleTranslations: { en: 'Azul', es: 'Azul' } }, 'en')).toEqual([])
    })
})
