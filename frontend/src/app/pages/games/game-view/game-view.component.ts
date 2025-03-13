import { CommonModule } from '@angular/common'
import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { Subscription } from 'rxjs'
import { Api } from '../../../api/api'
import type { GameViewType } from '../../../api/api.types'
import { CardGameComponent } from '../../../components/card-game/card-game.component'
import { ImageProfileComponent } from '../../../components/image-profile/image-profile.component'
import { TagsComponent } from '../../../components/tags/tags.component'
import { ToastService } from '../../../components/toast/toast.service'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { ImageBackgroundComponent } from '../../../components/ui/image-background/image-background.component'
import { ReviewDisplayComponent } from '../../../components/ui/review-display/review-display.component'
import { SpinnerComponent } from '../../../components/ui/spinner/spinner.component'
import { DataService } from '../../../core/services/data.service'

@Component({
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        ContainerWrapperComponent,
        ImageBackgroundComponent,
        ReviewDisplayComponent,
        TagsComponent,
        ButtonComponent,
        CardGameComponent,
        FormsModule,
        SpinnerComponent,
        ReactiveFormsModule,
        ImageProfileComponent,
    ],
    templateUrl: './game-view.component.html',
})
export class GameViewPageComponent implements OnDestroy {
    private readonly api = inject(Api)
    private readonly route = inject(ActivatedRoute)
    private readonly router = inject(Router)
    private readonly dataService = inject(DataService)
    private readonly toastService = inject(ToastService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser

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
    public wishlistAnimation = false // used for a little scale animation
    public reviewHoverValue = 0
    public isLoadingGameData = true // initial loading state
    // ownership form
    public ownershipFormGroup = new FormGroup({
        purchaseDate: new FormControl<string | null>(null, []),
        purchasePrice: new FormControl<number | null>(null, [Validators.min(0)]),
        purchaseNotes: new FormControl<string | null>(null, [Validators.maxLength(255)]),
    })

    // to prevent spamming actions, basically isLoading flags
    public readonly PREVENT_SPAM = {
        isLoadingWishlist: false,
        isLoadingReview: false,
        isLoadingUpdateOwnership: false,
        isLoadingAddToCollection: false,
        isLoadingRemoveFromCollection: false,
    }

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

        // scroll to the top of the page
        window.scrollTo(0, 0)
        this.isLoadingGameData = true

        this.api.getGameView(userId, gameId).subscribe({
            next: (game) => {
                this.gameView$.set(game)
                this.isLoadingGameData = false
                // ownership form
                if (game.ownedGameData) {
                    this.ownershipFormGroup.patchValue({
                        purchaseDate: game.ownedGameData.purchaseDate,
                        purchasePrice: game.ownedGameData.purchasePrice,
                        purchaseNotes: game.ownedGameData.purchaseNotes,
                    })
                }
            },
            error: (error) => {
                this.toastService.error('Error loading game data')
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
                if (response.isWishlisted) {
                    this.toastService.success('Game added to wishlist')
                } else {
                    this.toastService.success('Game removed from wishlist')
                }
            },
            error: (error) => {
                this.toastService.error('Error saving wishlist')
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

        if (!currentUser?.id || !gameId || this.PREVENT_SPAM.isLoadingReview) {
            return
        }

        this.PREVENT_SPAM.isLoadingReview = true

        this.api.saveGameReview(currentUser.id, gameId, reviewValue).subscribe({
            next: (res) => {
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
                this.toastService.success('Review saved')
            },
            error: (error) => {
                this.toastService.error('Error saving review')
            },
            complete: () => {
                this.PREVENT_SPAM.isLoadingReview = false
                this.dataService.refreshGameReviews()
            },
        })
    }

    // #region Ownership
    public addToCollection() {
        const currentUser = this.currentUser$()
        const gameId = this.gameView$()?.gameData?.id

        if (!currentUser?.id || !gameId || this.PREVENT_SPAM.isLoadingAddToCollection) {
            return
        }

        this.PREVENT_SPAM.isLoadingAddToCollection = true

        this.api.addGameToUserCollection(currentUser.id, gameId).subscribe({
            next: (res) => {
                this.toastService.success('Game added to collection')
                this.gameView$.update((game) => {
                    if (!game) {
                        return null
                    }

                    return {
                        ...game,
                        ownedGameData: {
                            purchaseDate: null,
                            purchasePrice: null,
                            purchaseNotes: null,
                        },
                    }
                })
            },
            error: (error) => {
                this.toastService.error('Error adding game to collection')
            },
            complete: () => {
                this.PREVENT_SPAM.isLoadingAddToCollection = false
            },
        })
    }

    public removeFromCollection() {
        const currentUser = this.currentUser$()
        const gameId = this.gameView$()?.gameData?.id

        if (!currentUser?.id || !gameId || this.PREVENT_SPAM.isLoadingRemoveFromCollection) {
            return
        }

        this.PREVENT_SPAM.isLoadingRemoveFromCollection = true

        this.api.removeGameFromUserCollection(currentUser.id, gameId).subscribe({
            next: (res) => {
                this.toastService.success('Game removed from collection')
                this.gameView$.update((game) => {
                    if (!game) {
                        return null
                    }

                    return { ...game, ownedGameData: null }
                })
            },
            error: (error) => {
                this.toastService.error('Error removing game from collection')
            },
            complete: () => {
                this.PREVENT_SPAM.isLoadingRemoveFromCollection = false
            },
        })
    }

    public saveOwnedGameDetails() {
        const currentUser = this.currentUser$()
        const gameId = this.gameView$()?.gameData?.id

        if (this.ownershipFormGroup.invalid || !currentUser?.id || !gameId || this.PREVENT_SPAM.isLoadingUpdateOwnership) {
            return
        }

        const formValue = this.ownershipFormGroup.value
        const updatedOwnedGameData: GameViewType['ownedGameData'] = {
            purchaseDate: formValue.purchaseDate || null,
            purchasePrice: formValue.purchasePrice || null,
            purchaseNotes: formValue.purchaseNotes || null,
        }

        this.PREVENT_SPAM.isLoadingUpdateOwnership = true

        this.api.patchGameOwnership(currentUser.id, gameId, updatedOwnedGameData).subscribe({
            next: (res) => {
                this.gameView$.update((game) => {
                    if (!game) {
                        return null
                    }

                    return { ...game, ownedGameData: res }
                })
                this.toastService.success('Purchase details updated')
            },
            error: (error) => {
                this.toastService.error('Error updating purchase details')
            },
            complete: () => {
                this.PREVENT_SPAM.isLoadingUpdateOwnership = false
            },
        })
    }

    shareGame() {}

    ngOnDestroy(): void {
        // unsubscribe from the route params
        this._routeSub?.unsubscribe()
    }
}
