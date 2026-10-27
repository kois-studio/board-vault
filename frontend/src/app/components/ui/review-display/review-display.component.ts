import { CommonModule } from '@angular/common'
import { Component, input } from '@angular/core'
import { formatNumber } from '../../../core/i18n/format'
import { IconComponent } from '../icon/icon.component'

@Component({
    imports: [CommonModule, IconComponent],
    selector: 'review-display',
    templateUrl: 'review-display.component.html',
})
export class ReviewDisplayComponent {
    readonly review = input.required<number>()

    // Optional props
    readonly flexCol = input(false)

    get fullStars(): number[] {
        return Array(Math.floor(this.review() / 2)).fill(0)
    }

    get halfStars(): number[] {
        return this.review() % 2 >= 1 ? [0] : []
    }

    get emptyStars(): number[] {
        return Array(5 - this.fullStars.length - this.halfStars.length).fill(0)
    }

    public parseReview(review: number): string {
        return formatNumber(review / 2, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    public get hasRating(): boolean {
        return this.review() > 0
    }

    public get ratingLabel(): string {
        return this.hasRating
            ? $localize`:Name of the stars showing a rating; the placeholder is the rating out of 5, such as 3.50:Rating ${this.parseReview(this.review())}:rating: out of 5`
            : $localize`:Name of the empty stars of a game with no rating:Not rated yet`
    }
}
