import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CardSectionComponent } from '../../components/cards/card-section/card-section.component'
import { CollectionActivityComponent } from '../../components/collection-activity/collection-activity.component'
import { BadgeComponent } from '../../components/ui/badge/badge.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'

@Component({
    imports: [
        RouterLink,
        PageHeaderComponent,
        ButtonComponent,
        ContainerWrapperComponent,
        CardSectionComponent,
        BadgeComponent,
        CollectionActivityComponent,
    ],
    templateUrl: 'collection-page.component.html',
})
export class CollectionPageComponent {
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)

    // --------------------------------------------------------------------------
    //        signals
    // --------------------------------------------------------------------------
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGroups$ = this.dataService.userGroups
    public readonly userGames$ = this.dataService.userGames
    public readonly isLoadingUserGames = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GAMES])
    public readonly userReviews$ = this.dataService.userReviews
    public readonly userWishlist$ = this.dataService.userWishlist
    public readonly userCollectionActivity$ = this.dataService.userCollectionActivity
    public readonly activationTarget = 5
    public readonly activationCount = computed(() => Math.min(this.userGames$().length, this.activationTarget))
    public readonly activationProgress = computed(() => (this.activationCount() / this.activationTarget) * 100)
    public readonly activationComplete = computed(() => this.userGames$().length >= this.activationTarget)
}
