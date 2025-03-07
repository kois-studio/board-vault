import { Component, computed, inject, Input } from '@angular/core';
import { Api } from '../../api/api';
import { DataService } from '../../core/services/data.service';

@Component({
    imports: [],
    selector: 'app-review-game',
    templateUrl: './review-game.component.html'
})
export class ReviewGameComponent {
    private readonly api = inject(Api)
    private readonly dataService = inject(DataService)

    private readonly userReviews$ = this.dataService.userReviews
    public readonly currentReviewComputed = computed(() => this.userReviews$().find((review) => review.gameId === this.gameId))

    @Input({ required: true }) accountId: number | undefined = 0
    @Input({ required: true }) gameId: number | undefined = 0
    @Input({ required: true }) reviewValue: number = 0

    // #region methods

    public setReview(reviewValue: number) {
        if (!this.accountId || !this.gameId) {
            return
        }

        const currentReview = this.currentReviewComputed()
        if (!currentReview) {
            // the game has no review yet, so we create a new one
            this.dataService.createGameReview(this.accountId, this.gameId, reviewValue)
        } else if (currentReview.review !== reviewValue) {
            // the game has a review, so we update it
            this.dataService.updateGameReview(this.accountId, this.gameId, reviewValue)
        }
    }
}
