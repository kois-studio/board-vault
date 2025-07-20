import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CardSectionComponent } from '../../components/cards/card-section/card-section.component'
import { CollectionActivityComponent } from '../../components/collection-activity/collection-activity.component'
import { BadgeComponent } from '../../components/ui/badge/badge.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import { DataService } from '../../core/services/data.service'

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

    // --------------------------------------------------------------------------
    //        signals
    // --------------------------------------------------------------------------
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGames$ = this.dataService.userGames
    public readonly userReviews$ = this.dataService.userReviews
    public readonly userWishlist$ = this.dataService.userWishlist
    public readonly userCollectionActivity$ = this.dataService.userCollectionActivity

}
