import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CardGameComponent } from '../../../components/card-game/card-game.component'
import { SkeletonCardGameComponent } from '../../../components/skeletons/skeleton-card-game/skeleton-card-game.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'

@Component({
    imports: [CardGameComponent, ContainerWrapperComponent, RouterLink, PageHeaderComponent, ButtonComponent, SkeletonCardGameComponent],
    templateUrl: 'browse-page.component.html',
})
export class BrowsePageComponent {
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userWishlist$ = this.dataService.userWishlist
    public readonly userGames$ = this.dataService.userGames
    public readonly gamesList$ = this.dataService.gamesList
    // loadingService
    public readonly isLoadingGames$ = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.GAMES_LIST])

    // --------------------------------------------------------------------------
    //        Computed
    // --------------------------------------------------------------------------
    public readonly gamesNotOwnedByUserComputed = computed(() => {
        const userGamesIds = this.userGames$().map((game) => game.id)
        return this.gamesList$()
            .filter((game) => !userGamesIds.includes(game.id))
            .sort((a, b) => a.title.localeCompare(b.title))
    })

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
}
