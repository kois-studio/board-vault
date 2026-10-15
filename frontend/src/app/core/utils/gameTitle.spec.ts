import { GameTitlePipe } from '../pipes/game-title.pipe'
import { gameTitle } from './gameTitle'

describe('gameTitle', () => {
    it('uses the English title, then the stored one', () => {
        expect(gameTitle({ title: 'Catan', titleTranslations: { en: 'Catan (EN)' } })).toBe('Catan (EN)')
        expect(gameTitle({ title: 'Catan', titleTranslations: { en: '' } })).toBe('Catan')
    })

    it('names a game the catalogue has no title for, instead of leaving it blank', () => {
        expect(gameTitle({ title: '', titleTranslations: { en: '' } })).toBe('Untitled game')
        expect(gameTitle({})).toBe('Untitled game')
        expect(new GameTitlePipe().transform({ title: null, titleTranslations: null })).toBe('Untitled game')
    })
})
