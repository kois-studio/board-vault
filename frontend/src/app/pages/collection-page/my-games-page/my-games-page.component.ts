import { Component, computed, inject } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
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
    imports: [CardGameComponent, ContainerWrapperComponent, RouterLink, PageHeaderComponent, SkeletonCardGameComponent, ButtonComponent],
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

    public retryGames() {
        this.dataService.refreshUserGames()
    }
}
