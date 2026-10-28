import { FormControl } from '@angular/forms'
import {
    addEdition,
    type EditionRow,
    editionRow,
    editionsError,
    editionsValidator,
    makePrimary,
    removeEdition,
    rowsFromEditions,
    rowsFromProposal,
    toEditionsBody,
    updateEdition,
} from './edition-rows'

const summary = (rows: ReadonlyArray<EditionRow>) => rows.map(({ languageCode, title, isPrimary }) => [languageCode, title, isPrimary])

describe('edition rows', () => {
    const rows = rowsFromEditions([
        { languageCode: 'de', title: 'Die Siedler von Catan', isPrimary: true },
        { languageCode: 'en', title: 'Catan', isPrimary: false },
    ])

    it('starts a proposal with its title in its language as primary, then its other titles', () => {
        const fromProposal = rowsFromProposal({
            title: 'Ciudadelas',
            titleLanguage: 'es',
            otherTitles: [{ languageCode: 'en', title: 'Citadels' }],
        })

        expect(summary(fromProposal)).toEqual([
            ['es', 'Ciudadelas', true],
            ['en', 'Citadels', false],
        ])
    })

    it('adds a row in the first interface language not used, primary only when it is the first', () => {
        expect(summary(addEdition([]))).toEqual([['en', '', true]])
        expect(summary(addEdition(rows))).toEqual([...summary(rows), ['es', '', false]])

        const all = ['en', 'es', 'fr', 'de', 'it'].map((code) => editionRow(code, 'x', false))
        expect(addEdition(all).at(-1)?.languageCode).toBe('')
    })

    it('keeps exactly one primary: choosing moves it, removing the primary hands it to the first left', () => {
        const [de, en] = rows as [EditionRow, EditionRow]

        expect(summary(makePrimary(rows, en.key))).toEqual([
            ['de', 'Die Siedler von Catan', false],
            ['en', 'Catan', true],
        ])
        expect(summary(removeEdition(rows, de.key))).toEqual([['en', 'Catan', true]])
        expect(summary(removeEdition(rows, en.key))).toEqual([['de', 'Die Siedler von Catan', true]])
        expect(removeEdition(removeEdition(rows, de.key), en.key)).toEqual([])
    })

    it('updates one row by key', () => {
        const [de] = rows as [EditionRow, EditionRow]

        expect(summary(updateEdition(rows, de.key, { languageCode: 'fr' }))[0]).toEqual(['fr', 'Die Siedler von Catan', true])
    })

    it('says the first problem the API would refuse, in its own rules', () => {
        const edition = (languageCode: string, title: string, isPrimary: boolean) => editionRow(languageCode, title, isPrimary)

        expect(editionsError(rows)).toBeNull()
        expect(editionsError([])).toBe('Add at least one edition.')
        expect(editionsError([edition('english', 'Catan', true)])).toContain('language code')
        expect(editionsError([edition('', 'Catan', true)])).toContain('language code')
        expect(editionsError([edition('en', '  ', true)])).toBe('Every edition needs a title.')
        expect(editionsError([edition('en', 'x'.repeat(201), true)])).toContain('200 characters')
        expect(editionsError([edition('en', 'Catan', true), edition('EN', 'Catan 2', false)])).toContain('one edition per language')
        expect(editionsError([edition('en', 'Catan', false)])).toBe('Choose one primary edition.')
        expect(editionsError([edition('en', 'Catan', true), edition('es', 'Catan', true)])).toBe('Choose one primary edition.')
    })

    it('makes a control invalid with the message, and valid again once fixed', () => {
        const control = new FormControl<ReadonlyArray<EditionRow>>([], { nonNullable: true, validators: [editionsValidator] })

        expect(control.errors).toEqual({ editions: 'Add at least one edition.' })
        control.setValue(rows)
        expect(control.valid).toBe(true)
    })

    it('sends titles trimmed and languages canonical, without the rows’ keys', () => {
        const body = toEditionsBody([editionRow('pt-br', '  Catan ', true), editionRow('DE', 'Die Siedler von Catan', false)])

        expect(body).toEqual([
            { languageCode: 'pt-BR', title: 'Catan', isPrimary: true },
            { languageCode: 'de', title: 'Die Siedler von Catan', isPrimary: false },
        ])
    })
})
