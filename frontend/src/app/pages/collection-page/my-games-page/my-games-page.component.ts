import { Component, computed, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CardGameComponent } from '../../../components/card-game/card-game.component'
import { CollectionActivityComponent } from '../../../components/collection-activity/collection-activity.component'
import { SkeletonCardGameComponent } from '../../../components/skeletons/skeleton-card-game/skeleton-card-game.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'

@Component({
    imports: [
        CardGameComponent,
        ContainerWrapperComponent,
        RouterLink,
        PageHeaderComponent,
        SkeletonCardGameComponent,
        IconComponent,
        CollectionActivityComponent,
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

    // Filter and sort, all client-side: a shelf is small.
    public readonly filterText = signal('')
    public readonly sortBy = signal<'title' | 'duration' | 'players'>('title')
    public readonly visibleGames = computed(() => {
        const query = this.filterText().trim().toLowerCase()
        const games = this.userGames$().filter(
            (game) => !query || Object.values(game.titleTranslations).some((title) => title?.toLowerCase().includes(query)),
        )
        const byTitle = (a: (typeof games)[number], b: (typeof games)[number]) =>
            a.titleTranslations.en.localeCompare(b.titleTranslations.en)
        return [...games].sort((a, b) => {
            if (this.sortBy() === 'duration') return (a.gameAvgDuration ?? 0) - (b.gameAvgDuration ?? 0) || byTitle(a, b)
            if (this.sortBy() === 'players') return (b.maxPlayers ?? 0) - (a.maxPlayers ?? 0) || byTitle(a, b)
            return byTitle(a, b)
        })
    })

    public setSort(value: string) {
        if (value === 'title' || value === 'duration' || value === 'players') this.sortBy.set(value)
    }

    public retryGames() {
        this.dataService.refreshUserGames()
    }
}
