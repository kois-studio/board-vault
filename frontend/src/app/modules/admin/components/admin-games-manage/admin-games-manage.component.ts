import { CommonModule } from '@angular/common'
import { Component, OnInit, inject, signal, ViewChild, effect } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { Api } from '../../../../api/api'
import type { GameWithTagsAndTranslationsType, TagType, TagCategoryType } from '../../../../api/api.types'
import { ToastService } from '../../../../components/toast/toast.service'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { LogService } from '../../../../core/services/log.service'
import { ModalEditGameTranslationsComponent } from '../../../../components/modals/modal-edit-game-translations/modal-edit-game-translations.component'
import { ModalEditGameTagsComponent } from '../../../../components/modals/modal-edit-game-tags/modal-edit-game-tags.component'
import { AdminGamesManageService } from './admin-games-manage.service'

@Component({
    imports: [CommonModule, ReactiveFormsModule, ButtonComponent, ModalEditGameTranslationsComponent, ModalEditGameTagsComponent],
    templateUrl: './admin-games-manage.component.html',
})
export class AdminGamesManageComponent implements OnInit {
    private readonly api = inject(Api)
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)
    private readonly adminGamesManageService = inject(AdminGamesManageService)

    // --------------------------------------------------------------------------
    //        Modal references
    // --------------------------------------------------------------------------
    @ViewChild(ModalEditGameTranslationsComponent) editTranslationsModal!: ModalEditGameTranslationsComponent
    @ViewChild(ModalEditGameTagsComponent) editTagsModal!: ModalEditGameTagsComponent

    // --------------------------------------------------------------------------
    //        Service signals
    // --------------------------------------------------------------------------
    public readonly gamesList$ = this.adminGamesManageService.gamesList
    public readonly searchTerm$ = this.adminGamesManageService.searchTerm
    public readonly searchTermIsValid$ = this.adminGamesManageService.searchTermIsValidComputed
    public readonly isSearching$ = this.adminGamesManageService.isSearching
    public readonly currentPage$ = this.adminGamesManageService.currentPage
    public readonly hasMoreGames$ = this.adminGamesManageService.hasMoreGames
    public readonly totalPages$ = this.adminGamesManageService.totalPages
    public readonly totalItems$ = this.adminGamesManageService.totalItems
    public readonly searchControl = this.adminGamesManageService.searchControl

    // --------------------------------------------------------------------------
    //        Signals
    // --------------------------------------------------------------------------
    public tags = signal<Array<TagType>>([])
    public categories = signal<Array<TagCategoryType>>([])
    public isLoadingTags = signal<boolean>(false)
    public isLoadingCategories = signal<boolean>(false)

    ngOnInit(): void {
        this._fetchTags()
        this._fetchCategories()
        this._initializeSearch()
    }

    private _initializeSearch(): void {
        // Initialize search with debounce
        this.searchControl.valueChanges
            .pipe(
                debounceTime(500), // Wait 500ms after the user stops typing
                distinctUntilChanged(), // Only emit if search term changed
            )
            .subscribe((value) => {
                this.searchTerm$.set(value || '')
                this.currentPage$.set(1) // Reset page when search changes
                this._searchGames()
            })

        // Setup effect to monitor changes in games list
        effect(() => {
            // This runs whenever gamesList$ changes
            const currentPage = this.currentPage$()
            const currentGames = this.gamesList$().length
            // Assuming the API returns less than limit when no more games are available
            this.hasMoreGames$.set(currentGames === 10 * currentPage) // 10 is the limit set in our API
        })

        // Load initial games
        this._searchGames()
    }

    private _fetchTags(): void {
        this.isLoadingTags.set(true)
        this.api.getAdminTags().subscribe({
            next: tags => {
                this.tags.set(tags)
                this.logger.log('Fetched tags successfully')
            },
            error: err => {
                this.logger.error('Error fetching tags', err)
                this.toastService.error('Could not load tags.')
            },
            complete: () => this.isLoadingTags.set(false),
        })
    }

    private _fetchCategories(): void {
        this.isLoadingCategories.set(true)
        this.api.getAdminTagCategories().subscribe({
            next: categories => {
                this.categories.set(categories)
                this.logger.log('Fetched categories successfully')
            },
            error: err => {
                this.logger.error('Error fetching categories', err)
                this.toastService.error('Could not load categories.')
            },
            complete: () => this.isLoadingCategories.set(false),
        })
    }

    // --------------------------------------------------------------------------
    //        Search Methods
    // --------------------------------------------------------------------------

    public loadMoreGames() {
        this.currentPage$.update((page) => page + 1)
        this._searchGames(true)
    }

    private _searchGames(isNextPage = false) {
        if (!this.searchTermIsValid$()) {
            return
        }

        // set the loading state
        this.isSearching$.set(true)
        if (!isNextPage) {
            this.gamesList$.set([])
        }

        // Fetch games with search term
        this.api
            .getAdminGames(
                this.searchTerm$().trim(),
                this.currentPage$(),
                10, // limit
            )
            .subscribe({
                next: (result) => {
                    if (!isNextPage) {
                        this.gamesList$.set(result.games)
                    } else {
                        this.gamesList$.update((games) => [...games, ...result.games])
                    }
                    
                    // Update pagination info
                    this.totalPages$.set(result.pagination.totalPages)
                    this.totalItems$.set(result.pagination.totalItems)
                },
                error: (error) => {
                    this.logger.error('Error searching games', error)
                    this.toastService.error('Could not search games.')
                },
                complete: () => {
                    this.isSearching$.set(false)
                },
            })
    }

    // --------------------------------------------------------------------------
    //        Action Handlers
    // --------------------------------------------------------------------------

    public onEditTranslations(game: GameWithTagsAndTranslationsType): void {
        this.editTranslationsModal.showDialog(game)
    }

    public onEditTags(game: GameWithTagsAndTranslationsType): void {
        this.editTagsModal.showDialog(game, this.tags(), this.categories())
    }

    // --------------------------------------------------------------------------
    //        Event Handlers
    // --------------------------------------------------------------------------
    public onTranslationsUpdated(update: any): void {
        // Refresh the games list to ensure we have the most up-to-date data
        this._searchGames()
    }

    public onTagsUpdated(update: any): void {
        // Refresh the games list to ensure we have the most up-to-date data
        this._searchGames()
    }

    // --------------------------------------------------------------------------
    //        Helper Methods
    // --------------------------------------------------------------------------

    public getTranslationEntries(translations: Record<string, string>): Array<[string, string]> {
        return Object.entries(translations)
    }
}
