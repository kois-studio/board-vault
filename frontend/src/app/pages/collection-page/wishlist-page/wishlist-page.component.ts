import { Component, computed, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { finalize } from 'rxjs'
import { Api } from '../../../api/api'
import type { GameCompleteType } from '../../../api/api.types'
import { CardGameComponent } from '../../../components/card-game/card-game.component'
import { SkeletonCardGameComponent } from '../../../components/skeletons/skeleton-card-game/skeleton-card-game.component'
import { ToastService } from '../../../components/toast/toast.service'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { WishlistToggleComponent } from '../../../components/wishlist-toggle/wishlist-toggle.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'

@Component({
    imports: [
        CardGameComponent,
        ContainerWrapperComponent,
        RouterLink,
        PageHeaderComponent,
        ButtonComponent,
        IconComponent,
        SkeletonCardGameComponent,
        WishlistToggleComponent,
    ],
    templateUrl: 'wishlist-page.component.html',
})
export class WishlistPageComponent {
    private readonly api = inject(Api)
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)
    private readonly toastService = inject(ToastService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userWishlist$ = this.dataService.userWishlist
    public readonly wishlistError = this.dataService.userWishlistError
    // loadingService
    public readonly isLoadingWishlist = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_WISHLIST])

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public readonly buyingGameId = signal<number | null>(null)

    /** Adds the game to My Games; the server takes it off the wishlist. */
    public markAsBought(game: GameCompleteType): void {
        const userId = this.currentUser$()?.id
        if (!userId || this.buyingGameId() !== null) return

        this.buyingGameId.set(game.id)
        this.api
            .addGameToUserCollection(userId, game.id)
            .pipe(finalize(() => this.buyingGameId.set(null)))
            .subscribe({
                next: () => {
                    this.userWishlist$.update((wishlist) => wishlist.filter((item) => item.id !== game.id))
                    this.dataService.refreshUserGames()
                    this.toastService.success(`${game.titleTranslations.en} moved to My Games`)
                },
                error: () => this.toastService.error('Could not add this game to My Games. Try again.'),
            })
    }

    public retryWishlist(): void {
        this.dataService.refreshUserWishlist()
    }
}
