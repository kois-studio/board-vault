import { computed, Injectable, signal } from '@angular/core'
import { GameCompleteType, GameType, GroupWithMembersAndGames, UserType } from '../../api/api.types'

/**
 * The group view has a lot of logic (signals, computed properties, etc)
 * This service is used to centralize the logic and make the component lighter
 */
@Injectable({ providedIn: 'root' })
export class GroupViewService {
    // --------------------------------------------------------------------------
    // #region           signals
    // --------------------------------------------------------------------------
    // members
    public readonly groupData = signal<GroupWithMembersAndGames | null>(null)
    public readonly selectedMembers = signal<number[]>([])

    // filters
    public readonly isFilteringGames = signal(false) // to filter out 'disabled' games
    public readonly isHidingMaxPlayers = signal(false) // to disable games based on min/max players
    public readonly isRecalculatingReviews = signal<boolean>(false) // to recalculate the reviews based on the selected members

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
                if (reviews[review.gameId] === undefined) {
                    reviews[review.gameId] = {}
                }
                reviews[review.gameId][member.id] = review.review
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
            let reviews: number[] = []

            if (this.isRecalculatingReviews() && this.selectedMembers().length > 0) {
                // Only include reviews from selected members
                for (const [userId, review] of Object.entries(value)) {
                    if (this.selectedMembers().includes(Number(userId))) {
                        reviews.push(review)
                    }
                }
            } else {
                reviews = Object.values(value)
            }

            if (reviews.length > 0) {
                const sum = reviews.reduce((acc, review) => acc + review, 0)
                result[Number(gameId)] = {
                    average: Number((sum / reviews.length).toFixed(2)),
                    voters: reviews.length,
                }
            }
        }

        return result
    })

    // --------------------------------------------------------------------------
    // #region           total unique games
    //
    // is computed based on the group members and the selected members
    // --------------------------------------------------------------------------
    public readonly totalUniqueGamesComputed = computed(
        (): Array<
            GameCompleteType & {
                quantity: number // number of copies of the game in the group
                active: boolean // to highlight or not in the UI
            }
        > => {
            const games: Array<GameCompleteType & { quantity: number; active: boolean }> = []

            // STEP 1: active/inactive games based on selected members (ownership)
            for (const member of this.groupData()?.members ?? []) {
                // add the games of the non-selected members as inactive
                if (!this.selectedMembers().includes(member.id)) {
                    for (const game of member.games) {
                        const gameObject = games.find((g) => g.id === game.id)
                        if (!gameObject) {
                            games.push({ ...game, active: false, quantity: 1 })
                        } else {
                            gameObject.quantity++
                        }
                    }
                }
                // add the games of the selected members as active
                else {
                    for (const game of member.games) {
                        const gameObject = games.find((g) => g.id === game.id)
                        if (!gameObject) {
                            games.push({ ...game, active: true, quantity: 1 })
                        } else {
                            // if was already added, simply update the active flag
                            const index = games.findIndex((g) => g.id === game.id)
                            games[index].active = true
                            games[index].quantity++
                        }
                    }
                }
            }

            // STEP 2: disable the games which min/max players are not suitable for the selected members
            if (this.isHidingMaxPlayers()) {
                for (const game of games) {
                    const tooManyPlayers = this.selectedMembers().length > game.maxPlayers
                    const tooFewPlayers = this.selectedMembers().length < game.minPlayers

                    if (tooManyPlayers || tooFewPlayers) {
                        game.active = false
                    }
                }
            }

            games.sort((a, b) => {
                const a_review = this.avgReviewsIndexComputed()[a.id]?.average ?? -1
                const b_review = this.avgReviewsIndexComputed()[b.id]?.average ?? -1

                if (a_review === b_review) {
                    // Sort by number of voters if average reviews are the same
                    const a_voters = this.avgReviewsIndexComputed()[a.id]?.voters ?? 0
                    const b_voters = this.avgReviewsIndexComputed()[b.id]?.voters ?? 0
                    return b_voters - a_voters
                }
                return b_review - a_review
            })

            // STEP 3: hide the games which are not active
            if (this.isFilteringGames()) {
                return games.filter((game) => game.active)
            }

            return games
        },
    )
}
