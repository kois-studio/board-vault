import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'

@Component({
    standalone: true,
    imports: [CommonModule],
    selector: 'review-display',
    templateUrl: 'review-display.component.html',
})
export class ReviewDisplayComponent {
    @Input({ required: true }) review = 0

    get fullStars(): number[] {
        return Array(Math.floor(this.review / 2)).fill(0)
    }

    get halfStars(): number[] {
        return this.review % 2 >= 1 ? [0] : []
    }

    get emptyStars(): number[] {
        return Array(5 - this.fullStars.length - this.halfStars.length).fill(0)
    }
}
