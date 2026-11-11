/**
 * Redis keys that more than one service touches: the service that caches a value and every service
 * that changes what it is built from (#295). Building them here means renaming one can never leave
 * an invalidation pointing at a key nobody writes any more. The strings are unchanged, so entries
 * already in Redis stay valid. Keys used inside a single service stay in that service.
 */
export const cacheKeys = {
    /** `GamesService.getGameById`. */
    gameById: (gameId: number) => `games:byId:${gameId}`,
    /** `GameTranslationService.getGameTranslations`. */
    gameTranslations: (gameId: number) => `game-translation:byGameId:${gameId}`,
    /** `GameTagsService.getGameTags`. */
    gameTags: (gameId: number) => `game-tags:byGameId:${gameId}`,
    /** `CollectionActivityService`: a person's recent shelf and wishlist activity. */
    collectionActivity: (accountId: number) => `collection-activity:byAccountId:${accountId}`,
    /** `GameProposalService.getUserProposalStats`: the counts on a person's submissions page. */
    proposalStats: (accountId: number) => `user-proposal-stats:${accountId}`,
} as const
