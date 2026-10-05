import type { TagType } from '../../../../api/api.types'
import { duplicateSearchTerms, matchProposedTags, parseProposedTags } from './proposal-review.utils'

describe('proposal review helpers', () => {
    it('reads proposed tags typed as a comma list or sent as a JSON array', () => {
        expect(parseProposedTags('strategy, Family ,, strategy')).toEqual(['strategy', 'Family'])
        expect(parseProposedTags('["Card game", "family"]')).toEqual(['Card game', 'family'])
        expect(parseProposedTags(null)).toEqual([])
        expect(parseProposedTags('  ')).toEqual([])
    })

    it('matches proposed tags to catalogue tags ignoring case, spaces and dashes', () => {
        const tags: Array<TagType> = [
            { id: 1, name: 'Strategy', categoryId: 1, gameCount: 0 },
            { id: 2, name: 'Card game', categoryId: 1, gameCount: 0 },
            { id: 3, name: 'Party', categoryId: 2, gameCount: 0 },
        ]

        expect(matchProposedTags(['strategy', 'card-game', 'cooperative'], tags)).toEqual([1, 2])
    })

    it('searches the whole title and its longest words for duplicates', () => {
        expect(duplicateSearchTerms('Azul: Summer Pavilion')).toEqual(['Azul: Summer Pavilion', 'Pavilion', 'Summer', 'Azul'])
        expect(duplicateSearchTerms('Catan: Base Game')).toEqual(['Catan: Base Game', 'Catan', 'Base', 'Game'])
        expect(duplicateSearchTerms('Azul')).toEqual(['Azul'])
        expect(duplicateSearchTerms('Go')).toEqual(['Go'])
    })
})
