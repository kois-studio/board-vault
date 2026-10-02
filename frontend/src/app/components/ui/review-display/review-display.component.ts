import { CommonModule } from '@angular/common'
import { Component, input } from '@angular/core'
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
        return (review / 2).toFixed(2)
    }

    public get hasRating(): boolean {
        return this.review() > 0
    }

    public get ratingLabel(): string {
        return this.hasRating ? `Rating ${this.parseReview(this.review())} out of 5` : 'Not rated yet'
    }
}
