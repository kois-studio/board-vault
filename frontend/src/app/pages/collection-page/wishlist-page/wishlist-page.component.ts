import { CommonModule } from '@angular/common'
import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { Api } from '../../../api/api'
import { CardGameComponent } from '../../../components/card-game/card-game.component'
import { SkeletonCardGameComponent } from '../../../components/skeletons/skeleton-card-game/skeleton-card-game.component'
import { ToastService } from '../../../components/toast/toast.service'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'

@Component({
    imports: [
        CommonModule,
        CardGameComponent,
        ContainerWrapperComponent,
        RouterLink,
        PageHeaderComponent,
        ButtonComponent,
        SkeletonCardGameComponent,
    ],
    templateUrl: 'wishlist-page.component.html',
    styleUrls: ['wishlist-page.component.scss'],
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
    // loadingService
    public readonly isLoadingWishlist = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_WISHLIST])

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public preventSpamIsLoadingWishlist = false

    public toggleWishlist(gameId: number): void {
        const currentUser = this.currentUser$()

        if (!currentUser?.id || !gameId || this.preventSpamIsLoadingWishlist) {
            return
        }

        this.preventSpamIsLoadingWishlist = true

        // save the wishlist status
        this.api.toggleWishlist(currentUser.id, gameId).subscribe({
            next: (response) => {
                this.userWishlist$.update((wishlist) => {
                    return wishlist.filter((game) => game.id !== gameId)
                })

                if (response.isWishlisted) {
                    // This should never happen
                    this.toastService.success('Game added to wishlist')
                } else {
                    this.toastService.success('Game removed from wishlist')
                }
            },
            error: (error) => {
                this.toastService.error('Error saving wishlist, will reload page')
                // reload page
                setTimeout(() => {
                    window.location.reload()
                }, 1000)
            },
            complete: () => {
                this.preventSpamIsLoadingWishlist = false
            },
        })
    }
}
