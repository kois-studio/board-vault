import { BadRequestException } from '@nestjs/common'

import { canonicalEditionLanguage, requireEditionLanguage, validateEditions, validateOtherTitles } from './edition-language.js'

describe('edition languages', () => {
    it.each([
        ['en', 'en'],
        ['EN', 'en'],
        ['pt-br', 'pt-BR'],
        ['fil', 'fil'],
        [' de ', 'de'],
    ])('canonicalizes %s as %s', (input, expected) => {
        expect(canonicalEditionLanguage(input)).toBe(expected)
    })

    it.each(['', 'e', 'english', 'zh-Hans-CN', 'en-US-x-foo', 'not a code', 'de_DE', '1234', 42, null])('rejects %s', input => {
        expect(canonicalEditionLanguage(input)).toBeNull()
        expect(() => requireEditionLanguage(input)).toThrow(BadRequestException)
    })
})

describe('validateEditions', () => {
    const de = { languageCode: 'de', title: 'Die Siedler von Catan', isPrimary: true }
    const en = { languageCode: 'en', title: 'Catan', isPrimary: false }

    it('trims titles, canonicalizes languages and keeps the order', () => {
        expect(
            validateEditions([
                { ...de, languageCode: 'DE', title: '  Die Siedler von Catan ' },
                { ...en, languageCode: 'pt-br' },
            ]),
        ).toEqual([de, { ...en, languageCode: 'pt-BR' }])
    })

    it.each([
        ['no editions', [], 'at least one'],
        ['no primary edition', [{ ...de, isPrimary: false }, en], 'Exactly one'],
        ['two primary editions', [de, { ...en, isPrimary: true }], 'Exactly one'],
        ['a duplicate language', [de, { ...en, languageCode: 'DE' }], 'one edition per language'],
        ['an empty title', [de, { ...en, title: '   ' }], 'needs a title'],
        ['a title that is too long', [{ ...de, title: 'x'.repeat(201) }], 'at most 200'],
        ['an invalid language', [{ ...de, languageCode: 'deutsch' }], 'language codes'],
    ])('rejects %s', (_name, editions, message) => {
        expect(() => validateEditions(editions)).toThrow(message)
    })
})

describe('validateOtherTitles', () => {
    it('keeps other languages and refuses repeats of the title language', () => {
        expect(validateOtherTitles('de', [{ languageCode: 'EN', title: ' Catan ' }])).toEqual([{ languageCode: 'en', title: 'Catan' }])
        expect(() => validateOtherTitles('de', [{ languageCode: 'de', title: 'Catan' }])).toThrow('only one title')
        expect(() =>
            validateOtherTitles('de', [
                { languageCode: 'en', title: 'Catan' },
                { languageCode: 'en', title: 'Catan 2' },
            ]),
        ).toThrow('only one title')
    })
})
