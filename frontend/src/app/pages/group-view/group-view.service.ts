import { computed, effect, Injectable, inject, signal, untracked } from '@angular/core'
import { GameCompleteType, GameType, GroupWithMembersAndGames, UserType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'

/**
 * The group view has a lot of logic (signals, computed properties, etc)
 * This service is used to centralize the logic and make the component lighter
 */
@Injectable({ providedIn: 'root' })
export class GroupViewService {
    // --------------------------------------------------------------------------
    // #region           signals
    // --------------------------------------------------------------------------
    public readonly groupData = signal<GroupWithMembersAndGames | null>(null)

    /** Library filter: only games for this many players; null shows every game. */
    public readonly playerCount = signal<number | null>(null)

    private readonly dataService = inject(DataService)

    constructor() {
        // Signing out clears this state, so the next account never sees it.
        effect(() => {
            if (!this.dataService.currentUser()) untracked(() => this.reset())
        })
    }

    public reset(): void {
        this.groupData.set(null)
        this.playerCount.set(null)
    }

    // --------------------------------------------------------------------------
    // #region           game reviews
    // --------------------------------------------------------------------------
    /**
     * Indexes all group members reviews by gameId and userId
     *
     * ```json
     * {
     *    "18": { // gameId
     *        "1": 5, // user 1 -> 5 stars
     *        "2": 4, // user 2 -> 4 stars
     *    },
     * }
     * ```
     */
    private readonly _gameReviewsComputed = computed<Record<GameType['id'], Record<UserType['id'], number>>>(() => {
        const reviews: Record<GameType['id'], Record<UserType['id'], number>> = {}

        // index all reviews by gameId and userId
        for (const member of this.groupData()?.members ?? []) {
            for (const review of member.reviews) {
                const gameReviews = reviews[review.gameId] ?? {}
                gameReviews[member.id] = review.review
                reviews[review.gameId] = gameReviews
            }
        }
        return reviews
    })

    // --------------------------------------------------------------------------
    // #region           avg reviews index
    //
    // is regenerated based on the changes of the list (members selected, filters, etc)
    // --------------------------------------------------------------------------
    public readonly avgReviewsIndexComputed = computed(() => {
        const result: Record<GameType['id'], { average: number; voters: number }> = {}

        for (const [gameId, value] of Object.entries(this._gameReviewsComputed())) {
            const reviews = Object.values(value)
            if (reviews.length > 0) {
                const sum = reviews.reduce((acc, review) => acc + review, 0)
                result[Number(gameId)] = { average: Number((sum / reviews.length).toFixed(2)), voters: reviews.length }
            }
        }

        return result
    })

    // --------------------------------------------------------------------------
    // #region           group library
    //
    // every game a member owns, with its number of copies, best rated first
    // --------------------------------------------------------------------------
    public readonly totalUniqueGamesComputed = computed((): Array<GameCompleteType & { quantity: number }> => {
        const games = new Map<number, GameCompleteType & { quantity: number }>()
        for (const member of this.groupData()?.members ?? []) {
            for (const game of member.games) {
                const existing = games.get(game.id)
                if (existing) existing.quantity++
                else games.set(game.id, { ...game, quantity: 1 })
            }
        }

        const players = this.playerCount()
        const reviews = this.avgReviewsIndexComputed()
        return [...games.values()]
            .filter((game) => players === null || (game.minPlayers <= players && players <= game.maxPlayers))
            .sort((a, b) => {
                const byAverage = (reviews[b.id]?.average ?? -1) - (reviews[a.id]?.average ?? -1)
                return byAverage || (reviews[b.id]?.voters ?? 0) - (reviews[a.id]?.voters ?? 0)
            })
    })
}
