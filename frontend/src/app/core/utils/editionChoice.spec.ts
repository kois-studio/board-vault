import { describe, expect, it } from 'vitest'
import { preselectedEdition } from './editionChoice'

const english = { id: 1, languageCode: 'en', title: 'Codenames', isPrimary: true }
const portuguese = { id: 3, languageCode: 'pt-BR', title: 'Código Secreto (BR)', isPrimary: false }
const codenames = [english, { id: 2, languageCode: 'es', title: 'Código Secreto', isPrimary: false }, portuguese]

describe('preselectedEdition', () => {
    it('picks the edition in the page language', () => {
        expect(preselectedEdition(codenames, 'es')?.id).toBe(2)
        expect(preselectedEdition(codenames, 'en')?.id).toBe(1)
    })

    it('falls back to the primary edition when there is none in the page language', () => {
        expect(preselectedEdition(codenames, 'fr')?.id).toBe(1)
        expect(preselectedEdition(codenames.slice().reverse(), 'de')?.id).toBe(1)
    })

    it('matches a regional edition to its language when nothing is exact', () => {
        expect(preselectedEdition([english, portuguese], 'it')?.id).toBe(1)
        expect(preselectedEdition([{ id: 9, languageCode: 'es-MX', title: 'Catán', isPrimary: false }, english], 'es')?.id).toBe(9)
    })

    it('takes the first edition of a game with no primary, and nothing for a game with none', () => {
        expect(preselectedEdition([{ id: 5, languageCode: 'de', title: 'Bärenpark', isPrimary: false }], 'es')?.id).toBe(5)
        expect(preselectedEdition([], 'es')).toBeNull()
    })

    it('reads the page language when none is given', () => {
        // Unit tests run in English.
        expect(preselectedEdition(codenames)?.id).toBe(1)
    })
})
