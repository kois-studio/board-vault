import { CommonModule } from '@angular/common'
import { Component, OnInit, inject, signal, ViewChild } from '@angular/core'
import { Api } from '../../../../api/api'
import type { GameWithTagsAndTranslationsType, TagType, TagCategoryType } from '../../../../api/api.types'
import { ToastService } from '../../../../components/toast/toast.service'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { LogService } from '../../../../core/services/log.service'
import { ModalEditGameTranslationsComponent } from '../../../../components/modals/modal-edit-game-translations/modal-edit-game-translations.component'
import { ModalEditGameTagsComponent } from '../../../../components/modals/modal-edit-game-tags/modal-edit-game-tags.component'

@Component({
    imports: [CommonModule, ButtonComponent, ModalEditGameTranslationsComponent, ModalEditGameTagsComponent],
    templateUrl: './admin-games-manage.component.html',
})
export class AdminGamesManageComponent implements OnInit {
    private readonly api = inject(Api)
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)

    // --------------------------------------------------------------------------
    //        Modal references
    // --------------------------------------------------------------------------
    @ViewChild(ModalEditGameTranslationsComponent) editTranslationsModal!: ModalEditGameTranslationsComponent
    @ViewChild(ModalEditGameTagsComponent) editTagsModal!: ModalEditGameTagsComponent

    // --------------------------------------------------------------------------
    //        Signals
    // --------------------------------------------------------------------------
    public games = signal<Array<GameWithTagsAndTranslationsType>>([])
    public tags = signal<Array<TagType>>([])
    public categories = signal<Array<TagCategoryType>>([])
    public isLoadingGames = signal<boolean>(false)
    public isLoadingTags = signal<boolean>(false)
    public isLoadingCategories = signal<boolean>(false)

    ngOnInit(): void {
        this._fetchGames()
        this._fetchTags()
        this._fetchCategories()
    }

    private _fetchGames(): void {
        this.isLoadingGames.set(true)
        this.api.getAdminGames().subscribe({
            next: games => {
                this.games.set(games)
                this.logger.log('Fetched games successfully')
            },
            error: err => {
                this.logger.error('Error fetching games', err)
                this.toastService.error('Could not load games.')
            },
            complete: () => this.isLoadingGames.set(false),
        })
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
        // Update the game in the local state
        const games = this.games()
        const gameIndex = games.findIndex(g => g.id === update.id)
        if (gameIndex !== -1) {
            const updatedGames = [...games]
            updatedGames[gameIndex] = {
                ...updatedGames[gameIndex],
                translations: update.translations,
            }
            this.games.set(updatedGames)
        }
    }

    public onTagsUpdated(update: any): void {
        // Update the game in the local state
        const games = this.games()
        const gameIndex = games.findIndex(g => g.id === update.id)
        if (gameIndex !== -1) {
            const updatedGames = [...games]
            const selectedTags = this.tags()
                .filter(tag => update.tagIds.includes(tag.id))
                .map(tag => {
                    const category = this.categories().find(c => c.id === tag.categoryId)
                    return {
                        id: tag.id,
                        name: tag.name,
                        categoryName: category ? category.name : 'Unknown Category',
                    }
                })
            
            updatedGames[gameIndex] = {
                ...updatedGames[gameIndex],
                tags: selectedTags,
            }
            this.games.set(updatedGames)
        }
    }

    // --------------------------------------------------------------------------
    //        Helper Methods
    // --------------------------------------------------------------------------

    public getTranslationEntries(translations: Record<string, string>): Array<[string, string]> {
        return Object.entries(translations)
    }
}
