import { Component, computed, effect, inject, signal, untracked } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router'
import { firstValueFrom, Subscription } from 'rxjs'
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { Api } from '../../../api/api'
import { BrowseFilters, BrowseSort, GameLength } from '../../../api/api.types'
import { CardGameComponent } from '../../../components/card-game/card-game.component'
import { SkeletonCardGameComponent } from '../../../components/skeletons/skeleton-card-game/skeleton-card-game.component'
import { ToastService } from '../../../components/toast/toast.service'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { WishlistToggleComponent } from '../../../components/wishlist-toggle/wishlist-toggle.component'
import { DataService } from '../../../core/services/data.service'
import { BrowsePageService, DEFAULT_BROWSE_FILTERS } from './browse-page.service'

/** The API's maximum page size; five rows of four or four rows of five. */
const BROWSE_PAGE_SIZE = 20

export const GAME_LENGTH_OPTIONS: Array<{ value: GameLength; label: string }> = [
    { value: 'short', label: 'Under 30 min' },
    { value: 'medium', label: '30–60 min' },
    { value: 'long', label: '1–2 hours' },
    { value: 'epic', label: 'Over 2 hours' },
]

export const BROWSE_SORT_OPTIONS: Array<{ value: BrowseSort; label: string }> = [
    { value: 'title', label: 'A–Z' },
    { value: 'shortest', label: 'Shortest first' },
    { value: 'newest', label: 'Newest in the catalogue' },
]

/** Reads the Browse filters from the page URL, dropping values the API would reject. */
export function parseBrowseFilters(params: ParamMap): BrowseFilters {
    const players = Number(params.get('players'))
    const length = GAME_LENGTH_OPTIONS.find((option) => option.value === params.get('length'))?.value ?? null
    const sort = BROWSE_SORT_OPTIONS.find((option) => option.value === params.get('sort'))?.value ?? 'title'
    const tags = (params.get('tags') ?? '')
        .split(',')
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)

    return {
        players: Number.isInteger(players) && players >= 1 && players <= 20 ? players : null,
        length,
        tags: [...new Set(tags)].slice(0, 10),
        hideOwned: params.get('hideOwned') === 'true',
        sort,
    }
}

@Component({
    imports: [
        CardGameComponent,
        ContainerWrapperComponent,
        IconComponent,
        RouterLink,
        PageHeaderComponent,
        ButtonComponent,
        SkeletonCardGameComponent,
        ReactiveFormsModule,
        WishlistToggleComponent,
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
    public readonly filters$ = this.browsePageService.filters
    public readonly catalogueTags$ = this.browsePageService.catalogueTags
    public readonly lengthOptions = GAME_LENGTH_OPTIONS
    public readonly sortOptions = BROWSE_SORT_OPTIONS
    public readonly playerOptions = Array.from({ length: 10 }, (_, index) => index + 1)
    public readonly filtersOpen = signal(false)
    public readonly tagsOpen = signal(false)
    private searchRequest?: Subscription
    public readonly searchError = signal(false)
    private initialLoadStarted = false
    public readonly acquisitionGroupId = signal<number | null>(null)
    public readonly acquisitionGroupName = computed(
        () => this.userGroups$().find((group) => group.id === this.acquisitionGroupId())?.name ?? 'this group',
    )
    public readonly acquisitionState = signal<Record<number, 'saving' | 'saved' | 'removing'>>({})
    public readonly acquisitionBoardLoading = signal(false)
    public readonly acquisitionBoardError = signal(false)
    private readonly acquisitionBoard = signal<Array<{ gameData: { id: number }; interestedBy: Array<{ id: number }> }>>([])
    public readonly collectionState = signal<Record<number, 'saving' | 'saved'>>({})

    // --------------------------------------------------------------------------
    //        Computed
    // --------------------------------------------------------------------------
    public readonly gamesListComputed = computed(() => {
        const browseGames = this.browseGamesList$()
        const userGames = this.userGames$()
        const groupOwnedGameIds = new Set(
            this.userGroups$()
                .find((group) => group.id === this.acquisitionGroupId())
                ?.members.flatMap((member) => member.games.map((game) => game.id)) ?? [],
        )

        return browseGames
            .filter((game) => !this.acquisitionGroupId() || !groupOwnedGameIds.has(game.id))
            .map((game) => ({
                ...game,
                isInCollection: userGames.some((userGame) => userGame.id === game.id),
            }))
    })

    public readonly activeFilterCount = computed(() => {
        const filters = this.filters$()
        return (filters.players === null ? 0 : 1) + (filters.length === null ? 0 : 1) + filters.tags.length + (filters.hideOwned ? 1 : 0)
    })

    public readonly tagGroups = computed(() => {
        const groups = new Map<string, ReturnType<typeof this.catalogueTags$>>()
        for (const tag of this.catalogueTags$()) groups.set(tag.categoryName, [...(groups.get(tag.categoryName) ?? []), tag])
        return [...groups].map(([category, tags]) => ({ category, tags }))
    })

    public readonly selectedTags = computed(() => {
        const chosen = this.filters$().tags
        return this.catalogueTags$().filter((tag) => chosen.includes(tag.id))
    })

    public readonly allSearchResultsOwnedByGroup = computed(
        () => this.acquisitionGroupId() !== null && this.browseGamesList$().length > 0 && this.gamesListComputed().length === 0,
    )

    constructor(
        private readonly route: ActivatedRoute,
        private readonly toastService: ToastService,
    ) {
        const requestedGroupId = Number(this.route.snapshot.queryParamMap.get('groupId'))
        if (Number.isInteger(requestedGroupId) && requestedGroupId > 0) {
            this.acquisitionGroupId.set(requestedGroupId)
            this.loadAcquisitionBoard(requestedGroupId)
        }

        this.applyUrlState(this.route.snapshot.queryParamMap)
        if (this.catalogueTags$().length === 0) {
            this.api
                .getCatalogueTags()
                .pipe(takeUntilDestroyed())
                .subscribe({
                    next: (tags) => this.catalogueTags$.set(tags),
                    // Browsing still works without tags; the tag filter just stays empty.
                    error: () => this.catalogueTags$.set([]),
                })
        }

        // Initialize search with debounce
        this.searchControl.valueChanges
            .pipe(
                debounceTime(500), // Wait 500ms after the user stops typing
                distinctUntilChanged(), // Only emit if search term changed
                takeUntilDestroyed(),
            )
            .subscribe((value) => {
                const trimmedValue = value?.trim() || ''
                this.searchTerm$.set(trimmedValue)
                this.currentPage$.set(1) // Reset page when search changes
                this.searchError.set(false)
                this.syncUrl()

                // Search when empty (whole catalogue) or from two letters
                if (trimmedValue.length === 0 || trimmedValue.length >= 2) {
                    this._searchGames()
                } else {
                    // Clear results if search term is too short
                    this.browseGamesList$.set([])
                    this.hasMoreGames$.set(false)
                }
            })

        // Show the catalogue as soon as the user is known, before any typing.
        effect(() => {
            if (this.currentUser$()?.id && !this.initialLoadStarted && this.browseGamesList$().length === 0 && this.searchTermIsValid$()) {
                this.initialLoadStarted = true
                untracked(() => this._searchGames())
            }
        })

        // Setup effect to monitor changes in games list and update hasMoreGames
        effect(() => {
            const currentPage = this.currentPage$()
            const currentGames = this.browseGamesList$().length
            const searchTermValid = this.searchTermIsValid$()

            // Only update hasMoreGames if we have games and the search is valid
            if (currentGames > 0 && searchTermValid) {
                const hasMore = currentGames === BROWSE_PAGE_SIZE * currentPage
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

    public setPlayers(value: string): void {
        this.applyFilters({ players: value ? Number(value) : null })
    }

    public setLength(value: string): void {
        this.applyFilters({ length: this.lengthOptions.find((option) => option.value === value)?.value ?? null })
    }

    public setSort(value: string): void {
        this.applyFilters({ sort: this.sortOptions.find((option) => option.value === value)?.value ?? 'title' })
    }

    public setHideOwned(hideOwned: boolean): void {
        this.applyFilters({ hideOwned })
    }

    public toggleTag(tagId: number): void {
        const tags = this.filters$().tags
        this.applyFilters({ tags: tags.includes(tagId) ? tags.filter((id) => id !== tagId) : [...tags, tagId] })
    }

    public clearFilters(): void {
        this.applyFilters({ ...DEFAULT_BROWSE_FILTERS, sort: this.filters$().sort })
    }

    public retrySearch(): void {
        this.searchError.set(false)
        this._searchGames()
    }

    public retryAcquisitionBoard(): void {
        const groupId = this.acquisitionGroupId()
        if (groupId) this.loadAcquisitionBoard(groupId)
    }

    public acquisitionActionState(gameId: number): 'saving' | 'saved' | 'removing' | null {
        const localState = this.acquisitionState()[gameId]
        if (localState) return localState

        const currentUserId = this.currentUser$()?.id
        if (
            currentUserId &&
            this.acquisitionBoard().some(
                (entry) => entry.gameData.id === gameId && entry.interestedBy.some((member) => member.id === currentUserId),
            )
        ) {
            return 'saved'
        }

        return null
    }

    public addGameToAcquisitionBoard(gameId: number): void {
        const groupId = this.acquisitionGroupId()
        if (!groupId || this.acquisitionBoardLoading() || this.acquisitionBoardError() || this.acquisitionActionState(gameId)) return

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

    public async removeGameFromAcquisitionBoard(gameId: number): Promise<void> {
        const groupId = this.acquisitionGroupId()
        if (!groupId || this.acquisitionActionState(gameId) !== 'saved') return

        this.acquisitionState.update((state) => ({ ...state, [gameId]: 'removing' }))
        try {
            await firstValueFrom(this.api.removeGroupAcquisitionInterest(groupId, gameId))
            this.acquisitionBoard.update((entries) =>
                entries.filter(
                    (entry) => entry.gameData.id !== gameId || !entry.interestedBy.some((member) => member.id === this.currentUser$()?.id),
                ),
            )
            this.acquisitionState.update((state) => {
                const nextState = { ...state }
                delete nextState[gameId]
                return nextState
            })
            this.toastService.success(`Removed your interest from ${this.acquisitionGroupName()}'s acquisition board.`)
        } catch {
            this.acquisitionState.update((state) => ({ ...state, [gameId]: 'saved' }))
            this.toastService.error('Could not remove your interest from the group board.')
        }
    }

    public addGameToCollection(gameId: number): void {
        const userId = this.currentUser$()?.id
        if (!userId || this.collectionState()[gameId] || this.userGames$().some((game) => game.id === gameId)) return

        this.collectionState.update((state) => ({ ...state, [gameId]: 'saving' }))
        this.api.addGameToUserCollection(userId, gameId).subscribe({
            next: () => {
                this.collectionState.update((state) => ({ ...state, [gameId]: 'saved' }))
                // The server takes an owned game off the wishlist.
                this.dataService.userWishlist.update((wishlist) => wishlist.filter((game) => game.id !== gameId))
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

        // The next page waits for the current request; a new search or filter replaces it.
        if (isNextPage && this.isSearching$()) {
            return
        }
        this.searchRequest?.unsubscribe()

        // set the loading state
        this.isSearching$.set(true)
        this.searchError.set(false)
        if (!isNextPage) {
            this.browseGamesList$.set([])
        }

        // Fetch games with search term
        this.searchRequest = this.api
            .browseGamesNotOwnedByUser(userId, this.searchTerm$().trim(), this.currentPage$(), BROWSE_PAGE_SIZE, this.filters$())
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

    /** The URL decides what Browse shows, so a filtered view survives a reload and can be shared. */
    private applyUrlState(params: ParamMap): void {
        const search = params.get('q')?.trim() ?? ''
        const filters = parseBrowseFilters(params)
        if (search === this.searchTerm$() && JSON.stringify(filters) === JSON.stringify(this.filters$())) return

        this.searchTerm$.set(search)
        this.searchControl.setValue(search, { emitEvent: false })
        this.filters$.set(filters)
        this.currentPage$.set(1)
        this.browseGamesList$.set([])
    }

    private applyFilters(patch: Partial<BrowseFilters>): void {
        this.filters$.update((filters) => ({ ...filters, ...patch }))
        this.currentPage$.set(1)
        this.syncUrl()
        this._searchGames()
    }

    private syncUrl(): void {
        const filters = this.filters$()
        void this.router.navigate([], {
            relativeTo: this.route,
            replaceUrl: true,
            queryParamsHandling: 'merge',
            queryParams: {
                q: this.searchTerm$() || null,
                players: filters.players,
                length: filters.length,
                tags: filters.tags.length > 0 ? filters.tags.join(',') : null,
                hideOwned: filters.hideOwned ? 'true' : null,
                sort: filters.sort === 'title' ? null : filters.sort,
            },
        })
    }

    private loadAcquisitionBoard(groupId: number): void {
        this.acquisitionBoardLoading.set(true)
        this.acquisitionBoardError.set(false)
        this.api.getGroupAcquisitionBoard(groupId).subscribe({
            next: (entries) => this.acquisitionBoard.set(entries),
            error: () => {
                this.acquisitionBoardLoading.set(false)
                this.acquisitionBoard.set([])
                this.acquisitionBoardError.set(true)
            },
            complete: () => this.acquisitionBoardLoading.set(false),
        })
    }
}
