import { Component, computed, effect, inject, signal } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { Api } from '../../../api/api'
import { CardGameComponent } from '../../../components/card-game/card-game.component'
import { SkeletonCardGameComponent } from '../../../components/skeletons/skeleton-card-game/skeleton-card-game.component'
import { ToastService } from '../../../components/toast/toast.service'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { DataService } from '../../../core/services/data.service'
import { BrowsePageService } from './browse-page.service'

@Component({
    imports: [
        CardGameComponent,
        ContainerWrapperComponent,
        RouterLink,
        PageHeaderComponent,
        ButtonComponent,
        SkeletonCardGameComponent,
        ReactiveFormsModule,
    ],
    templateUrl: 'browse-page.component.html',
})
export class BrowsePageComponent {
    private readonly api = inject(Api)
    private readonly dataService = inject(DataService)
    private readonly browsePageService = inject(BrowsePageService)
    private readonly router = inject(Router)
    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGroups$ = this.dataService.userGroups
    public readonly userGames$ = this.dataService.userGames
    // browsePageService
    public readonly browseGamesList$ = this.browsePageService.browseGamesList
    public readonly searchTerm$ = this.browsePageService.searchTerm
    public readonly searchTermIsValid$ = this.browsePageService.searchTermIsValidComputed
    public readonly isSearching$ = this.browsePageService.isSearching
    public readonly currentPage$ = this.browsePageService.currentPage
    public readonly hasMoreGames$ = this.browsePageService.hasMoreGames
    public readonly searchControl = this.browsePageService.searchControl
    public readonly searchError = signal(false)
    public readonly acquisitionGroupId = signal<number | null>(null)
    public readonly acquisitionGroupName = computed(
        () => this.userGroups$().find((group) => group.id === this.acquisitionGroupId())?.name ?? 'this group',
    )
    public readonly acquisitionState = signal<Record<number, 'saving' | 'saved'>>({})
    public readonly collectionState = signal<Record<number, 'saving' | 'saved'>>({})

    // --------------------------------------------------------------------------
    //        Computed
    // --------------------------------------------------------------------------
    public readonly gamesListComputed = computed(() => {
        const browseGames = this.browseGamesList$()
        const userGames = this.userGames$()

        return browseGames.map((game) => ({
            ...game,
            isInCollection: userGames.some((userGame) => userGame.id === game.id),
        }))
    })

    constructor(
        private readonly route: ActivatedRoute,
        private readonly toastService: ToastService,
    ) {
        const requestedGroupId = Number(this.route.snapshot.queryParamMap.get('groupId'))
        if (Number.isInteger(requestedGroupId) && requestedGroupId > 0) {
            this.acquisitionGroupId.set(requestedGroupId)
        }

        // Initialize search with debounce
        this.searchControl.valueChanges
            .pipe(
                debounceTime(500), // Wait 500ms after the user stops typing
                distinctUntilChanged(), // Only emit if search term changed
            )
            .subscribe((value) => {
                const trimmedValue = value?.trim() || ''
                this.searchTerm$.set(trimmedValue)
                this.currentPage$.set(1) // Reset page when search changes
                this.searchError.set(false)

                // Only search if the term is valid
                if (trimmedValue.length >= 3) {
                    this._searchGames()
                } else {
                    // Clear results if search term is too short
                    this.browseGamesList$.set([])
                    this.hasMoreGames$.set(false)
                }
            })

        // Setup effect to monitor changes in games list and update hasMoreGames
        effect(() => {
            const currentPage = this.currentPage$()
            const currentGames = this.browseGamesList$().length
            const searchTermValid = this.searchTermIsValid$()

            // Only update hasMoreGames if we have games and the search is valid
            if (currentGames > 0 && searchTermValid) {
                const hasMore = currentGames === 12 * currentPage // 12 is the limit set in your API
                this.hasMoreGames$.set(hasMore)
            } else {
                this.hasMoreGames$.set(false)
            }
        })
    }

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------

    public loadMoreGames() {
        // Prevent loading more if already searching or no more games
        if (this.isSearching$() || !this.hasMoreGames$()) {
            return
        }

        this.currentPage$.update((page) => page + 1)
        this._searchGames(true)
    }

    public navigateToProposeGame() {
        const searchTerm = this.searchTerm$().trim()
        if (searchTerm) {
            this.router.navigate(['/collection/propose-game'], {
                queryParams: { title: searchTerm },
            })
        } else {
            this.router.navigate(['/collection/propose-game'])
        }
    }

    public retrySearch(): void {
        this.searchError.set(false)
        this._searchGames()
    }

    public addGameToAcquisitionBoard(gameId: number): void {
        const groupId = this.acquisitionGroupId()
        if (!groupId || this.acquisitionState()[gameId]) return

        this.acquisitionState.update((state) => ({ ...state, [gameId]: 'saving' }))
        this.api.addGroupAcquisitionInterest(groupId, gameId).subscribe({
            next: () => {
                this.acquisitionState.update((state) => ({ ...state, [gameId]: 'saved' }))
                this.toastService.success(`Added to ${this.acquisitionGroupName()}'s acquisition board.`)
            },
            error: () => {
                this.acquisitionState.update((state) => {
                    const nextState = { ...state }
                    delete nextState[gameId]
                    return nextState
                })
                this.toastService.error('Could not add this game to the group board.')
            },
        })
    }

    public addGameToCollection(gameId: number): void {
        const userId = this.currentUser$()?.id
        if (!userId || this.collectionState()[gameId] || this.userGames$().some((game) => game.id === gameId)) return

        this.collectionState.update((state) => ({ ...state, [gameId]: 'saving' }))
        this.api.addGameToUserCollection(userId, gameId).subscribe({
            next: () => {
                this.collectionState.update((state) => ({ ...state, [gameId]: 'saved' }))
                this.dataService.refreshUserGames()
                this.toastService.success('Game added to your collection.')
            },
            error: () => {
                this.collectionState.update((state) => {
                    const nextState = { ...state }
                    delete nextState[gameId]
                    return nextState
                })
                this.toastService.error('Could not add this game to your collection.')
            },
        })
    }

    private _searchGames(isNextPage = false) {
        if (!this.searchTermIsValid$()) {
            return
        }

        const userId = this.currentUser$()?.id
        if (!userId) {
            return
        }

        // Prevent multiple simultaneous searches
        if (this.isSearching$()) {
            return
        }

        // set the loading state
        this.isSearching$.set(true)
        this.searchError.set(false)
        if (!isNextPage) {
            this.browseGamesList$.set([])
        }

        // Fetch games with search term
        this.api
            .browseGamesNotOwnedByUser(
                userId,
                this.searchTerm$().trim(),
                this.currentPage$(),
                12, // limit
            )
            .subscribe({
                next: (result) => {
                    if (!isNextPage) {
                        this.browseGamesList$.set(result.games)
                    } else {
                        this.browseGamesList$.update((games) => [...games, ...result.games])
                    }
                },
                error: (error) => {
                    console.error(error)
                    this.searchError.set(true)
                    this.isSearching$.set(false)
                },
                complete: () => {
                    this.isSearching$.set(false)
                },
            })
    }
}
