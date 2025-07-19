import { CommonModule } from '@angular/common'
import { Component, OnInit, inject, signal } from '@angular/core'
import { Api } from '../../../../api/api'
import type { GameWithTagsAndTranslationsType, TagType } from '../../../../api/api.types'
import { ToastService } from '../../../../components/toast/toast.service'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { LogService } from '../../../../core/services/log.service'

@Component({
    imports: [CommonModule, ButtonComponent],
    templateUrl: './admin-games-manage.component.html',
})
export class AdminGamesManageComponent implements OnInit {
    private readonly api = inject(Api)
    private readonly logger = inject(LogService)
    private readonly toastService = inject(ToastService)

    // --------------------------------------------------------------------------
    //        Signals
    // --------------------------------------------------------------------------
    public games = signal<Array<GameWithTagsAndTranslationsType>>([])
    public tags = signal<Array<TagType>>([])
    public isLoadingGames = signal<boolean>(false)
    public isLoadingTags = signal<boolean>(false)

    ngOnInit(): void {
        this._fetchGames()
        this._fetchTags()
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

    // --------------------------------------------------------------------------
    //        Action Handlers
    // --------------------------------------------------------------------------

    public onEditTranslations(game: GameWithTagsAndTranslationsType): void {
        // TODO: Implement edit translations modal
        console.log('Edit translations for game:', game.id)
    }

    public onEditTags(game: GameWithTagsAndTranslationsType): void {
        // TODO: Implement edit tags modal
        console.log('Edit tags for game:', game.id)
    }

    // --------------------------------------------------------------------------
    //        Helper Methods
    // --------------------------------------------------------------------------

    public getTranslationEntries(translations: Record<string, string>): Array<[string, string]> {
        return Object.entries(translations)
    }
}
