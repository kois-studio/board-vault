import { Component, computed, effect, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { CardGameComponent } from '../../../components/card-game/card-game.component'
import { SkeletonCardGameComponent } from '../../../components/skeletons/skeleton-card-game/skeleton-card-game.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { DataService } from '../../../core/services/data.service'
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { Api } from '../../../api/api'
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
    public readonly userWishlist$ = this.dataService.userWishlist
    public readonly userGames$ = this.dataService.userGames
    // browsePageService
    public readonly browseGamesList$ = this.browsePageService.browseGamesList
    public readonly searchTerm$ = this.browsePageService.searchTerm
    public readonly isSearching$ = this.browsePageService.isSearching
    public readonly currentPage$ = this.browsePageService.currentPage
    public readonly hasMoreGames$ = this.browsePageService.hasMoreGames
    public readonly searchControl = this.browsePageService.searchControl

    constructor() {
        // Initialize search with debounce
        this.searchControl.valueChanges
            .pipe(
                debounceTime(800), // Wait 800ms after the user stops typing
                distinctUntilChanged(), // Only emit if search term changed
            )
            .subscribe(value => {
                this.searchTerm$.set(value || '')
                this.currentPage$.set(1) // Reset page when search changes
                this._searchGames()
            })

        // Setup effect to monitor changes in games list
        effect(() => {
            // This runs whenever gamesList$ changes
            // We can use it to update the hasMoreGames signal
            const currentGames = this.browseGamesList$().length
            // Assuming the API returns less than limit when no more games are available
            this.hasMoreGames$.set(currentGames === 20) // 20 is the limit set in your API
        })
    }

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------
    public loadMoreGames() {
        this.currentPage$.update(page => page + 1)
        this._searchGames()
    }

    private _searchGames() {
        if (this.searchTerm$().length < 2 && this.searchTerm$().length > 0) {
            return // Don't search with just 1 character
        }

        const userId = this.currentUser$()?.id
        if (!userId) {
            return
        }

        // set the loading state
        this.isSearching$.set(true)

        // Fetch games with search term
        this.api
            .browseGamesNotOwnedByUser(
                userId,
                this.searchTerm$(),
                this.currentPage$(),
                20, // limit
            )
            .subscribe({
                next: (result) => {
                    console.log(result)
                    this.browseGamesList$.set(result.games)
                },
                error: (error) => {
                    console.error(error)
                },
                complete: () => {
                    this.isSearching$.set(false)
                },
            })
    }
}
