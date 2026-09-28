import { Component, computed, effect, inject, signal } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { Api } from '../../../api/api'
import { CardGameComponent } from '../../../components/card-game/card-game.component'
import { SkeletonCardGameComponent } from '../../../components/skeletons/skeleton-card-game/skeleton-card-game.component'
import { ToastService } from '../../../components/toast/toast.service'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { DataService } from '../../../core/services/data.service'
import { BrowsePageService } from './browse-page.service'

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
