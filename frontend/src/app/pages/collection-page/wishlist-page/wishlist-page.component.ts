import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CardGameComponent } from '../../../components/card-game/card-game.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { DataService } from '../../../core/services/data.service'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { LoadingService } from '../../../core/services/loading.service'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { SkeletonCardGroupComponent } from '../../../components/skeletons/skeleton-card-group/skeleton-card-group.component'

@Component({
    imports: [CardGameComponent, ContainerWrapperComponent, RouterLink, PageHeaderComponent, ButtonComponent, SkeletonCardGroupComponent],
    templateUrl: 'wishlist-page.component.html',
})
export class WishlistPageComponent {
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)
    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userWishlist$ = this.dataService.userWishlist
    // loadingService
    public readonly isLoadingWishlist = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_WISHLIST])
}
