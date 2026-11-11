import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CardSectionComponent } from '../../components/cards/card-section/card-section.component'
import { CollectionActivityComponent } from '../../components/collection-activity/collection-activity.component'
import { BadgeComponent } from '../../components/ui/badge/badge.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../components/ui/page-header/page-header.component'
import type { ResourceState } from '../../core/async/resource-state'
import { intlLocale } from '../../core/i18n/format'
import { DataService } from '../../core/services/data.service'

/** The Collection landing page: one card per subpage, then recent activity. */
@Component({
    imports: [
        ButtonComponent,
        RouterLink,
        PageHeaderComponent,
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
    public readonly userGames$ = this.dataService.userGames
    public readonly userReviews$ = this.dataService.userReviews
    public readonly userWishlist$ = this.dataService.userWishlist
    /** Each card counts only what has loaded: never "0 games" while it loads or after it failed (#256). */
    public readonly gamesBadge = computed(() => this.badge(this.dataService.userGamesState(), (count) => this.gamesLabel(count)))
    public readonly reviewsBadge = computed(() => this.badge(this.dataService.userReviewsState(), (count) => this.reviewsLabel(count)))
    public readonly wishlistBadge = computed(() => this.badge(this.dataService.userWishlistState(), (count) => this.gamesLabel(count)))

    public readonly loadingLabel = $localize`:Badge on a Collection card while its count loads:Loading…`
    public readonly unavailableLabel = $localize`:Badge on a Collection card when its count could not load:Unavailable`

    /** A refresh keeps the count it had; a failure says the count is unavailable. */
    private badge(state: ResourceState<ReadonlyArray<unknown>>, label: (count: number) => string): string {
        if (state.status === 'loading') return this.loadingLabel
        if (state.status === 'error') return this.unavailableLabel
        return label(state.value.length)
    }

    /** "1 game", "3 games". */
    public gamesLabel(count: number): string {
        return new Intl.PluralRules(intlLocale()).select(count) === 'one'
            ? $localize`:collection games badge, one|Badge on a Collection card counting games, one:${count}:count: game`
            : $localize`:collection games badge, other|Badge on a Collection card counting games, more than one:${count}:count: games`
    }

    /** "1 review", "3 reviews". */
    public reviewsLabel(count: number): string {
        return new Intl.PluralRules(intlLocale()).select(count) === 'one'
            ? $localize`:collection reviews badge, one|Badge on the Reviews card counting your ratings, one:${count}:count: review`
            : $localize`:collection reviews badge, other|Badge on the Reviews card counting your ratings, more than one:${count}:count: reviews`
    }
}
