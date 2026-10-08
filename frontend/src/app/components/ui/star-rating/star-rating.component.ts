import { Component, input, output, signal } from '@angular/core'
import { IconComponent } from '../icon/icon.component'

/** Five stars that set a review on the 0–10 scale (each star is 2 points), as on the Reviews page. */
@Component({
    imports: [IconComponent],
    selector: 'app-star-rating',
    templateUrl: 'star-rating.component.html',
})
export class StarRatingComponent {
    /** The current review, 0–10; 0 or null when not rated. */
    readonly value = input<number | null>(null)
    /** Names what is being rated in each star's label, for example the game title. */
    readonly label = input.required<string>()
    readonly disabled = input(false)
    readonly rated = output<number>()

    readonly STARS = [2, 4, 6, 8, 10]
    readonly hover = signal(0)

    isFilled(star: number): boolean {
        return star <= (this.hover() || this.value() || 0)
    }
}
