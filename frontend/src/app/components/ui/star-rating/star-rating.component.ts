import { Component, computed, input, output, signal } from '@angular/core'
import { formatNumber } from '../../../core/i18n/format'
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

    readonly groupLabel = computed(
        () =>
            $localize`:Name of the five rating stars; the placeholder is what is rated, usually a game title:Your rating for ${this.label()}:subject:`,
    )

    starLabel(star: number): string {
        return $localize`:Name of one rating star; the placeholders are the stars it gives, such as 2.5, and what is rated, usually a game title:Rate ${formatNumber(star / 2)}:stars: out of 5 stars for ${this.label()}:subject:`
    }

    isFilled(star: number): boolean {
        return star <= (this.hover() || this.value() || 0)
    }
}
