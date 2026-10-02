import { Component, input } from '@angular/core'
import { IconComponent } from '../ui/icon/icon.component'
import { ImageBackgroundComponent } from '../ui/image-background/image-background.component'
import { ReviewDisplayComponent } from '../ui/review-display/review-display.component'

@Component({
    imports: [ReviewDisplayComponent, ImageBackgroundComponent, IconComponent],
    selector: 'app-card-game',
    templateUrl: 'card-game.component.html',
})
export class CardGameComponent {
    readonly title = input.required<string>()
    readonly imageUrl = input.required<string>()
    readonly gameAvgDuration = input.required<number>()
    readonly minPlayers = input.required<number>()
    readonly maxPlayers = input.required<number>()
    readonly review = input<null | number>(null)

    /** "2 players" or "2–4 players". */
    get playersLabel(): string {
        const min = this.minPlayers() || this.maxPlayers()
        const max = this.maxPlayers() || this.minPlayers()
        if (!min) return ''
        return min === max ? `${min} player${min === 1 ? '' : 's'}` : `${min}–${max} players`
    }
}
