import { Component, computed, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { GameCompleteType } from '../../../api/api.types'
import { SkeletonReviewGameComponent } from '../../../components/skeletons/skeleton-review-game/skeleton-review-game.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'
import { ReviewRowComponent } from './review-row/review-row.component'

export type ReviewSort = 'title' | 'rating' | 'recent'

const byTitle = (a: GameCompleteType, b: GameCompleteType) => a.titleTranslations.en.localeCompare(b.titleTranslations.en)

@Component({
    imports: [ContainerWrapperComponent, PageHeaderComponent, ButtonComponent, RouterLink, ReviewRowComponent, SkeletonReviewGameComponent],
    templateUrl: 'reviews-page.component.html',
})
export class ReviewsPageComponent {
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)

    public readonly userGroups$ = this.dataService.userGroups
    public readonly userReviews$ = this.dataService.userReviews
    public readonly reviewsError = this.dataService.userReviewsError
    public readonly isLoadingReviews = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_REVIEWS])

    public readonly sortBy = signal<ReviewSort>('title')

    /** Your ratings in the chosen order. A–Z is the default because it doesn't move a row you just rated. */
    public readonly sortedReviews = computed(() => {
        const reviews = [...this.userReviews$()]
        switch (this.sortBy()) {
            case 'rating':
                return reviews.sort((a, b) => b.review - a.review || byTitle(a.gameData, b.gameData))
            case 'recent':
                return reviews.sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime())
            default:
                return reviews.sort((a, b) => byTitle(a.gameData, b.gameData))
        }
    })

    /** Games someone in your groups owns that you haven't rated, once each, A–Z. */
    public readonly pendingReviews = computed(() => {
        const rated = new Set(this.userReviews$().map((review) => review.gameId))
        const games = new Map<number, GameCompleteType>()
        for (const group of this.userGroups$()) {
            for (const member of group.members) {
                for (const game of member.games) {
                    if (!rated.has(game.id)) games.set(game.id, game)
                }
            }
        }
        return [...games.values()].sort(byTitle)
    })

    public setSort(value: string): void {
        if (value === 'title' || value === 'rating' || value === 'recent') this.sortBy.set(value)
    }

    public retryReviews(): void {
        this.dataService.refreshGameReviews()
    }
}
