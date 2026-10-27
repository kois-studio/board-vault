import { canonicalLanguageCode, languageName } from './language-names'

describe('language names', () => {
    it('names a language in the page language, and falls back to the code', () => {
        expect(languageName('de')).toBe('German')
        expect(languageName('pt-BR')).toBe('Brazilian Portuguese')
        expect(languageName('not a code')).toBe('not a code')
    })

    it('canonicalizes the codes the API takes and refuses the rest', () => {
        expect(canonicalLanguageCode('pt-br')).toBe('pt-BR')
        expect(canonicalLanguageCode(' EN ')).toBe('en')
        expect(canonicalLanguageCode('fil')).toBe('fil')
        for (const bad of ['', 'e', 'english', 'zh-Hans-CN', 'de_DE']) expect(canonicalLanguageCode(bad)).toBeNull()
    })
})
