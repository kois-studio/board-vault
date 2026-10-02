import { CommonModule } from '@angular/common'
import { Component, computed, effect, inject, OnDestroy, signal } from '@angular/core'
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { finalize, Subscription } from 'rxjs'
import { Api } from '../../../api/api'
import type { GameViewType } from '../../../api/api.types'
import { CardGameComponent } from '../../../components/card-game/card-game.component'
import { ImageProfileComponent } from '../../../components/image-profile/image-profile.component'
import { TagsComponent } from '../../../components/tags/tags.component'
import { ToastService } from '../../../components/toast/toast.service'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { ImageBackgroundComponent } from '../../../components/ui/image-background/image-background.component'
import { SpinnerComponent } from '../../../components/ui/spinner/spinner.component'
import { CustomDatePipe } from '../../../core/pipes/customDate.pipe'
import { DataService } from '../../../core/services/data.service'

@Component({
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        ContainerWrapperComponent,
        ImageBackgroundComponent,
        IconComponent,
        TagsComponent,
        ButtonComponent,
        CardGameComponent,
        SpinnerComponent,
        ReactiveFormsModule,
        ImageProfileComponent,
        CustomDatePipe,
    ],
    templateUrl: './game-view.component.html',
})
export class GameViewPageComponent implements OnDestroy {
    private readonly api = inject(Api)
    private readonly route = inject(ActivatedRoute)
    private readonly dataService = inject(DataService)
    private readonly toastService = inject(ToastService)

    // Custom validator for positive number (including 0)
    private positiveNumberValidator(control: AbstractControl): ValidationErrors | null {
        const value = control.value
        if (value === null || value === '') {
            return null // Allow null/empty values
        }

        const numValue = Number(value)
        if (Number.isNaN(numValue) || numValue < 0) {
            return { positiveNumber: true }
        }

        return null
    }

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGroups$ = this.dataService.userGroups
    private readonly userHistory$ = this.dataService.userHistory

    // --------------------------------------------------------------------------
    //        Component singals
    // --------------------------------------------------------------------------
    public readonly gameView$ = signal<GameViewType | null>(null)
    public readonly gameUserReviewComputed = computed(() => this.gameView$()?.ratingData?.userRating ?? 0)
    public readonly isWishlistedComputed = computed(() => !!this.gameView$()?.wishlistedGameData)
    public readonly userHistoryFilteredComputed = computed(() => {
        const userHistory = this.userHistory$()
        // take only the meetings where we played the game in view
        const userHistoryFiltered = userHistory.filter((history) =>
            history.gamesPlayed.some((game) => game.gameData.id === this.gameView$()?.gameData.id),
        )
        // ignore the rest of games -> convert `gamesPlayed` to `gamePlayed`
        return userHistoryFiltered.map((history) => {
            return {
                ...history,
                gamePlayed: history.gamesPlayed.find((game) => game.gameData.id === this.gameView$()?.gameData.id),
            }
        })
    })

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    private _routeSub: Subscription | undefined
    private lastLoadedGameKey: string | null = null
    public wishlistAnimation = false // used for a little scale animation
    // A signal, not a field: the load can start inside an effect, where a plain field change is never rendered.
    public readonly isLoadingGameData = signal(true)
    public readonly gameLoadError = signal(false)
    // ownership form
    public ownershipFormGroup = new FormGroup({
        purchaseDate: new FormControl<string | null>(null, []),
        purchasePrice: new FormControl<number | null>(null, [this.positiveNumberValidator.bind(this)]),
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
        this._routeSub = this.route.paramMap.subscribe((params) => {
            const gameId = Number.parseInt(params.get('gameId') || '', 10)
            this._loadGameData(this.currentUser$()?.id, gameId)
        })

        effect(() => {
            const currentUser = this.currentUser$()
            const gameId = Number.parseInt(this.route.snapshot.paramMap.get('gameId') || '', 10)

            if (currentUser?.id && !Number.isNaN(gameId)) {
                this._loadGameData(currentUser.id, gameId)
            }
        })
    }

    private _loadGameData(userId: undefined | number, gameId: number, force = false) {
        if (Number.isNaN(gameId) || !userId) {
            return
        }

        const loadKey = `${userId}:${gameId}`
        if (!force && this.lastLoadedGameKey === loadKey) {
            return
        }
        this.lastLoadedGameKey = loadKey

        // scroll to the top of the page
        window.scrollTo(0, 0)
        this.isLoadingGameData.set(true)
        this.gameLoadError.set(false)

        this.api.getGameView(userId, gameId).subscribe({
            next: (game) => {
                this.gameView$.set(game)
                this.isLoadingGameData.set(false)
                // ownership form
                if (game.ownedGameData) {
                    this.ownershipFormGroup.patchValue({
                        purchaseDate: game.ownedGameData.purchaseDate,
                        purchasePrice: game.ownedGameData.purchasePrice,
                        purchaseNotes: game.ownedGameData.purchaseNotes,
                    })
                }
            },
            error: () => {
                this.isLoadingGameData.set(false)
                this.gameLoadError.set(true)
                this.toastService.error('Error loading game data')
            },
        })
    }

    public retryGameLoad(): void {
        const currentUser = this.currentUser$()
        const gameId = Number.parseInt(this.route.snapshot.paramMap.get('gameId') || '', 10)
        this._loadGameData(currentUser?.id, gameId, true)
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
        this.api
            .toggleWishlist(currentUser.id, gameId)
            .pipe(
                finalize(() => {
                    this.PREVENT_SPAM.isLoadingWishlist = false
                }),
            )
            .subscribe({
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

                    // Refresh the global wishlist state to keep it in sync
                    this.dataService.refreshUserWishlist()
                },
                error: () => {
                    this.toastService.error('Error saving wishlist')
                    // On error, reload the game data
                    this._loadGameData(currentUser.id, gameId)
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

        this.api
            .saveGameReview(currentUser.id, gameId, reviewValue)
            .pipe(
                finalize(() => {
                    this.PREVENT_SPAM.isLoadingReview = false
                }),
            )
            .subscribe({
                next: () => {
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
                error: () => {
                    this.toastService.error('Error saving review')
                    // On error, reload the game data
                    this._loadGameData(currentUser.id, gameId)
                },
                complete: () => {
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

        this.api
            .addGameToUserCollection(currentUser.id, gameId)
            .pipe(
                finalize(() => {
                    this.PREVENT_SPAM.isLoadingAddToCollection = false
                }),
            )
            .subscribe({
                next: () => {
                    this.toastService.success('Game added to collection')

                    // Check if the game was in the wishlist before adding to collection
                    const wasInWishlist = this.isWishlistedComputed()

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
                            // Automatically remove from wishlist when added to collection
                            wishlistedGameData: null,
                        }
                    })

                    // Show notification if the game was automatically removed from wishlist
                    if (wasInWishlist) {
                        this.toastService.info('Game automatically removed from wishlist')
                    }

                    // Refresh the wishlist to ensure consistency with server state
                    this.dataService.refreshUserWishlist()
                    this.dataService.refreshUserGames()
                },
                error: () => {
                    this.toastService.error('Error adding game to collection')
                    // On error, reload the game data
                    this._loadGameData(currentUser.id, gameId)
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

        this.api
            .removeGameFromUserCollection(currentUser.id, gameId)
            .pipe(
                finalize(() => {
                    this.PREVENT_SPAM.isLoadingRemoveFromCollection = false
                }),
            )
            .subscribe({
                next: () => {
                    this.toastService.success('Game removed from collection')
                    this.gameView$.update((game) => {
                        if (!game) {
                            return null
                        }

                        return { ...game, ownedGameData: null }
                    })
                    this.dataService.refreshUserGames()
                },
                error: () => {
                    this.toastService.error('Error removing game from collection')
                    // On error, reload the game data
                    this._loadGameData(currentUser.id, gameId)
                },
            })
    }

    /** For each of your groups, who owns this game there (members and people without an account). */
    public readonly groupOwnershipComputed = computed(() => {
        const gameId = this.gameView$()?.gameData.id
        if (!gameId) return []

        return this.userGroups$()
            .map((group) => ({
                group,
                owners: [
                    ...group.members
                        .filter((member) => member.games.some((game) => game.id === gameId))
                        .map((member) => member.displayName || member.username),
                    ...(group.placeholders ?? []).filter((person) => person.gameIds.includes(gameId)).map((person) => person.displayName),
                ],
            }))
            .filter((entry) => entry.owners.length > 0)
    })

    /** "2 players", "2–4 players", or null when unknown. */
    public readonly playersLabelComputed = computed(() => {
        const game = this.gameView$()?.gameData
        if (!game?.minPlayers && !game?.maxPlayers) return null
        const min = game.minPlayers ?? game.maxPlayers
        const max = game.maxPlayers ?? game.minPlayers
        return min === max ? `${min} player${min === 1 ? '' : 's'}` : `${min}–${max} players`
    })

    /** Averages are stored out of 10 and shown out of 5. */
    public outOfFive(review: number | undefined): string {
        return review ? (review / 2).toFixed(1) : '–'
    }

    public getGroupName(groupId: number): string {
        return this.userGroups$().find((group) => group.id === groupId)?.name ?? `Group ${groupId}`
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
            purchasePrice: formValue.purchasePrice ? Number(formValue.purchasePrice) : null,
            purchaseNotes: formValue.purchaseNotes || null,
        }

        this.PREVENT_SPAM.isLoadingUpdateOwnership = true

        this.api
            .patchGameOwnership(currentUser.id, gameId, updatedOwnedGameData)
            .pipe(
                finalize(() => {
                    this.PREVENT_SPAM.isLoadingUpdateOwnership = false
                }),
            )
            .subscribe({
                next: (res) => {
                    this.gameView$.update((game) => {
                        if (!game) {
                            return null
                        }

                        return { ...game, ownedGameData: res }
                    })
                    this.toastService.success('Purchase details updated')
                },
                error: () => {
                    this.toastService.error('Error updating purchase details')
                    // On error, reload the game data
                    this._loadGameData(currentUser.id, gameId)
                },
            })
    }

    ngOnDestroy(): void {
        // unsubscribe from the route params
        this._routeSub?.unsubscribe()
    }
}
