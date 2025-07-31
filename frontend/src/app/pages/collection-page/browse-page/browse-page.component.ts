import { Component, computed, effect, inject } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { Api } from '../../../api/api'
import { CardGameComponent } from '../../../components/card-game/card-game.component'
import { SkeletonCardGameComponent } from '../../../components/skeletons/skeleton-card-game/skeleton-card-game.component'
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
    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGames$ = this.dataService.userGames
    // browsePageService
    public readonly browseGamesList$ = this.browsePageService.browseGamesList
    public readonly searchTerm$ = this.browsePageService.searchTerm
    public readonly searchTermIsValid$ = this.browsePageService.searchTermIsValidComputed
    public readonly isSearching$ = this.browsePageService.isSearching
    public readonly currentPage$ = this.browsePageService.currentPage
    public readonly hasMoreGames$ = this.browsePageService.hasMoreGames
    public readonly searchControl = this.browsePageService.searchControl

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

    constructor() {
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
                    this.isSearching$.set(false)
                },
                complete: () => {
                    this.isSearching$.set(false)
                },
            })
    }
}
