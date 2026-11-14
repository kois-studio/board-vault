import { duplicateSearchTerms, parseProposedTags } from './proposal-review.utils'

describe('proposal review helpers', () => {
    it('reads proposed tags typed as a comma list or sent as a JSON array', () => {
        expect(parseProposedTags('strategy, Family ,, strategy')).toEqual(['strategy', 'Family'])
        expect(parseProposedTags('["Card game", "family"]')).toEqual(['Card game', 'family'])
        expect(parseProposedTags(null)).toEqual([])
        expect(parseProposedTags('  ')).toEqual([])
    })

    it('searches the whole title and its longest words for duplicates', () => {
        expect(duplicateSearchTerms('Azul: Summer Pavilion')).toEqual(['Azul: Summer Pavilion', 'Pavilion', 'Summer', 'Azul'])
        expect(duplicateSearchTerms('Catan: Base Game')).toEqual(['Catan: Base Game', 'Catan', 'Base', 'Game'])
        expect(duplicateSearchTerms('Azul')).toEqual(['Azul'])
        expect(duplicateSearchTerms('Go')).toEqual(['Go'])
    })
})
