import { CommonModule } from '@angular/common'
import { Component, OnInit, inject, signal, ViewChild } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { Api } from '../../../../api/api'
import type { GameWithTagsAndTranslationsType, TagType, TagCategoryType } from '../../../../api/api.types'
import { ToastService } from '../../../../components/toast/toast.service'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { TagsComponent } from '../../../../components/tags/tags.component'
import { SpinnerComponent } from '../../../../components/ui/spinner/spinner.component'
import { LogService } from '../../../../core/services/log.service'
import { ModalEditGameTranslationsComponent } from '../../../../components/modals/modal-edit-game-translations/modal-edit-game-translations.component'
import { ModalEditGameTagsComponent } from '../../../../components/modals/modal-edit-game-tags/modal-edit-game-tags.component'
import { AdminGamesManageService } from './admin-games-manage.service'
import { AdminTagsManageService } from '../admin-tags-manage/admin-tags-manage.service'

@Component({
    imports: [CommonModule, ReactiveFormsModule, ButtonComponent, TagsComponent, SpinnerComponent, ModalEditGameTranslationsComponent, ModalEditGameTagsComponent],
    templateUrl: './admin-games-manage.component.html',
})
export class AdminGamesManageComponent implements OnInit {
    private readonly api = inject(Api)
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)
    private readonly adminGamesManageService = inject(AdminGamesManageService)
    private readonly adminTagsManageService = inject(AdminTagsManageService)

    constructor() {
        // No longer need effect since we don't load games by default
    }

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
    public readonly searchControl = this.adminGamesManageService.searchControl

    // --------------------------------------------------------------------------
    //        Service signals
    // --------------------------------------------------------------------------
    public readonly tags = this.adminTagsManageService.tags
    public readonly categories = this.adminTagsManageService.tagCategories
    public readonly isLoadingTags = this.adminTagsManageService.isLoadingTags
    public readonly isLoadingCategories = this.adminTagsManageService.isLoadingCategories

    async ngOnInit(): Promise<void> {
        try {
            await this.adminTagsManageService.initialize()
        } catch (error) {
            this.toastService.error('Could not load tags and categories.')
        }
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
                this._searchGames()
            })

        // Don't load initial games - wait for user to search
    }



    // --------------------------------------------------------------------------
    //        Search Methods
    // --------------------------------------------------------------------------

    private _searchGames() {
        if (!this.searchTermIsValid$()) {
            return
        }

        // set the loading state
        this.isSearching$.set(true)
        this.gamesList$.set([])

        // Fetch games with search term
        this.api
            .getAdminGames(
                this.searchTerm$().trim(),
                1, // Always start from page 1
                10, // limit
            )
            .subscribe({
                next: (result) => {
                    this.logger.log('Search games result:', result.games.length, 'games')
                    this.logger.log('Search game IDs:', result.games.map(g => g.id))
                    this.gamesList$.set(result.games)
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

    private _refreshGamesList() {
        this.logger.log('_refreshGamesList called with search term:', this.searchTerm$())
        // Force refresh the games list regardless of search term validation
        // This is used when translations or tags are updated
        this.isSearching$.set(true)
        
        // Fetch games with current search term (even if it's 1-2 characters)
        this.api
            .getAdminGames(
                this.searchTerm$().trim(),
                1, // Always start from page 1
                10, // limit
            )
            .subscribe({
                next: (result) => {
                    this.logger.log('Games list refreshed, received:', result.games.length, 'games')
                    this.logger.log('Game IDs:', result.games.map(g => g.id))
                    this.gamesList$.set(result.games)
                },
                error: (error) => {
                    this.logger.error('Error refreshing games list', error)
                    this.toastService.error('Could not refresh games list.')
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
        this.logger.log('Translations updated, refreshing games list:', update)
        // Refresh the games list to ensure we have the most up-to-date data
        this._refreshGamesList()
    }

    public onTagsUpdated(update: any): void {
        this.logger.log('Tags updated, refreshing games list:', update)
        // Refresh the games list to ensure we have the most up-to-date data
        this._refreshGamesList()
    }

    // --------------------------------------------------------------------------
    //        Helper Methods
    // --------------------------------------------------------------------------

    public getTranslationEntries(translations: Record<string, string>): Array<[string, string]> {
        return Object.entries(translations)
    }

    public getTagsForDisplay(tags: Array<{ id: number; name: string; categoryName: string }>): Array<{ tag: string; category: string }> {
        return tags.map(tag => ({
            tag: tag.name,
            category: tag.categoryName
        }))
    }
}
