import { Component, EventEmitter, Input, Output, computed, inject } from '@angular/core'
import { DataService } from '../../core/services/data.service'

@Component({
    imports: [],
    selector: 'app-review-game',
    templateUrl: './review-game.component.html',
})
export class ReviewGameComponent {
    private readonly dataService = inject(DataService)

    private readonly userReviews$ = this.dataService.userReviews
    public readonly currentReviewComputed = computed(() => this.userReviews$().find((review) => review.gameId === this.gameId))

    @Input({ required: true }) accountId: number | undefined = 0
    @Input({ required: true }) gameId: number | undefined = 0
    @Input({ required: true }) reviewValue = 0
    @Output() reviewValueChanged = new EventEmitter<number>()

    // #region methods

    public setReview(reviewValue: number) {
        if (!this.accountId || !this.gameId) {
            return
        }

        this.dataService.saveGameReview(this.accountId, this.gameId, reviewValue)

        this.reviewValueChanged.emit(reviewValue)
    }
}
