import { CommonModule } from '@angular/common'
import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { Subscription } from 'rxjs'
import { Api } from '../../../api/api'
import type { GameViewType } from '../../../api/api.types'
import { CardGameComponent } from '../../../components/card-game/card-game.component'
import { TagsComponent } from '../../../components/tags/tags.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { ImageBackgroundComponent } from '../../../components/ui/image-background/image-background.component'
import { ReviewDisplayComponent } from '../../../components/ui/review-display/review-display.component'
import { DataService } from '../../../core/services/data.service'

@Component({
    imports: [
        CommonModule,
        FormsModule,
        ContainerWrapperComponent,
        ImageBackgroundComponent,
        ReviewDisplayComponent,
        TagsComponent,
        ButtonComponent,
        CardGameComponent,
        FormsModule,
    ],
    templateUrl: './game-view.component.html',
})
export class GameViewPageComponent implements OnDestroy {
    private readonly dataService = inject(DataService)
    private readonly route = inject(ActivatedRoute)
    private readonly router = inject(Router)
    private readonly api = inject(Api)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGames$ = this.dataService.userGames

    // --------------------------------------------------------------------------
    //        Component singals
    // --------------------------------------------------------------------------
    public gameView$ = signal<GameViewType | null>(null)
    public gameUserReviewComputed = computed(() => this.gameView$()?.ratingData?.userRating ?? 0)
    public isWishlistedComputed = computed(() => !!this.gameView$()?.wishlistedGameData)

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    private _routeSub: Subscription | undefined
    public isLoading = false
    public wishlistAnimation = false // used for a little scale animation
    public reviewHoverValue = 0
    private readonly PREVENT_SPAM = {
        isLoadingWishlist: false,
    }

    // TODO: delete this
    averageRating = 7.5
    tags = [
        { tag: 'tag1', category: 'category1' },
        { tag: 'tag2', category: 'category2' },
        { tag: 'tag3', category: 'category3' },
    ]
    purchaseDate = new Date()
    purchasePrice = 100
    purchaseNotes = 'This is a note about the game'
    playHistory = [
        {
            playDate: new Date(),
            playNotes: 'This is a note about the play',
            date: new Date(),
            group: 'Group 1',
            players: [
                {
                    name: 'Player 1',
                    avatar: 'https://th.bing.com/th/id/OIP.Nov0duOiE7Mh5CjeKhbGBgHaE8?w=244&h=180&c=7&r=0&o=5&pid=1.7',
                },
            ],
        },
    ]

    constructor() {
        effect(() => {
            const currentUser = this.currentUser$()

            // On route change
            this._routeSub = this.route.paramMap.subscribe((params) => {
                const gameId = Number.parseInt(params.get('gameId') || '')
                this._loadGameData(currentUser?.id, gameId)
            })
        })
    }

    private _loadGameData(userId: undefined | number, gameId: number) {
        if (Number.isNaN(gameId) || !userId) {
            return
        }

        this.api.getUserGame(userId, gameId).subscribe({
            next: (game) => {
                this.gameView$.set(game)
            },
            error: (error) => {
                console.error(error)
            },
        })
    }

    public navigateToGame(gameId: number) {
        const currentUser = this.currentUser$()
        if (!currentUser) {
            return
        }

        // changes the URL but doesn't triggers the effect
        this.router.navigate(['/games', gameId])

        // re-fetch the game data
        this.api.getUserGame(currentUser.id, gameId).subscribe({
            next: (game) => {
                this.gameView$.set(game)
            },
            error: (error) => {
                console.error(error)
            },
        })
    }

    // #region Wishlist

    public toggleWishlist(): void {
        const currentUser = this.currentUser$()
        const gameId = this.gameView$()?.gameData?.id

        if (!currentUser?.id || !gameId || this.PREVENT_SPAM.isLoadingWishlist) {
            return
        }

        this.PREVENT_SPAM.isLoadingWishlist = true

        // Trigger the animation
        this.wishlistAnimation = true
        setTimeout(() => {
            this.wishlistAnimation = false
        }, 300)

        // save the wishlist status
        this.api.toggleWishlist(currentUser.id, gameId).subscribe({
            next: (response) => {
                this.gameView$.update((game) => {
                    if (!game) {
                        return null
                    }

                    return {
                        ...game,
                        wishlistedGameData: response.isWishlisted
                            ? {
                                  dateAdded: new Date().toISOString(),
                                  notes: '',
                              }
                            : null,
                    }
                })
            },
            error: (error) => {
                console.error(error)
            },
            complete: () => {
                this.PREVENT_SPAM.isLoadingWishlist = false
            },
        })
    }

    // #region Review

    public saveGameReview(reviewValue: number): void {
        const currentUser = this.currentUser$()
        const gameId = this.gameView$()?.gameData?.id

        if (!currentUser?.id || !gameId) {
            return
        }

        this.dataService.saveGameReview(currentUser.id, gameId, reviewValue)
        console.log('reviewValue', reviewValue)
        this.gameView$.update((game) => {
            if (!game) {
                return null
            }

            return {
                ...game,
                ratingData: {
                    ...game.ratingData,
                    userRating: reviewValue,
                },
            }
        })
    }

    shareGame() {}
    addToCollection() {}
    saveOwnedGameDetails() {}
    removeFromCollection() {}
    rateGame(rating: number) {}

    ngOnDestroy(): void {
        // unsubscribe from the route params
        this._routeSub?.unsubscribe()
    }
}
