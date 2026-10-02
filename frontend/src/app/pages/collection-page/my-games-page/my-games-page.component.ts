import { Component, computed, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CardGameComponent } from '../../../components/card-game/card-game.component'
import { SkeletonCardGameComponent } from '../../../components/skeletons/skeleton-card-game/skeleton-card-game.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'

@Component({
    imports: [
        ButtonComponent,
        CardGameComponent,
        ContainerWrapperComponent,
        RouterLink,
        PageHeaderComponent,
        SkeletonCardGameComponent,
        IconComponent,
    ],
    templateUrl: 'my-games-page.component.html',
})
export class MyGamesPageComponent {
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)
    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // loadingService
    public readonly isLoadingUserGames = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GAMES])
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGames$ = this.dataService.userGames
    public readonly userGamesError = this.dataService.userGamesError

    // Filter and sort, all client-side: a shelf is small. A short shelf is
    // easier to scan than to filter, so the toolbar appears from TOOLBAR_FROM games.
    public readonly TOOLBAR_FROM = 12
    public readonly PLAYER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    public readonly showToolbar = computed(() => this.userGames$().length >= this.TOOLBAR_FROM)
    public readonly filterText = signal('')
    /** Only games that play with this many people; null for any. */
    public readonly playerCount = signal<number | null>(null)
    public readonly sortBy = signal<'title' | 'duration'>('title')
    public readonly visibleGames = computed(() => {
        const toolbar = this.showToolbar()
        const query = toolbar ? this.filterText().trim().toLowerCase() : ''
        const players = toolbar ? this.playerCount() : null
        const games = this.userGames$().filter(
            (game) =>
                (!query || Object.values(game.titleTranslations).some((title) => title?.toLowerCase().includes(query))) &&
                (players === null || (game.minPlayers <= players && players <= game.maxPlayers)),
        )
        const byTitle = (a: (typeof games)[number], b: (typeof games)[number]) =>
            a.titleTranslations.en.localeCompare(b.titleTranslations.en)
        return [...games].sort((a, b) => {
            if (toolbar && this.sortBy() === 'duration') return (a.gameAvgDuration ?? 0) - (b.gameAvgDuration ?? 0) || byTitle(a, b)
            return byTitle(a, b)
        })
    })

    public setSort(value: string) {
        if (value === 'title' || value === 'duration') this.sortBy.set(value)
    }

    public setPlayerCount(value: string) {
        const count = Number(value)
        this.playerCount.set(Number.isInteger(count) && count > 0 ? count : null)
    }

    public clearFilters() {
        this.filterText.set('')
        this.playerCount.set(null)
    }

    public retryGames() {
        this.dataService.refreshUserGames()
    }
}
