import { cacheKeys } from './cache-keys.js'

describe('cacheKeys (#295)', () => {
    it('builds the same keys the services always used, so entries already in Redis stay valid', () => {
        expect(cacheKeys.gameById(12)).toBe('games:byId:12')
        expect(cacheKeys.gameTags(12)).toBe('game-tags:byGameId:12')
        expect(cacheKeys.collectionActivity(7)).toBe('collection-activity:byAccountId:7')
        expect(cacheKeys.proposalStats(7)).toBe('user-proposal-stats:7')
    })
})
