import { Component, Input } from '@angular/core'
import { ReviewDisplayComponent } from '../ui/review-display/review-display.component'

@Component({
    standalone: true,
    imports: [ReviewDisplayComponent],
    selector: 'app-card-game',
    templateUrl: 'card-game.component.html',
})
export class CardGameComponent {
    @Input({ required: true }) title = ''
    @Input({ required: true }) imageUrl = ''
    @Input({ required: true }) gameAvgDuration = 0
    @Input({ required: true }) minPlayers = 0
    @Input({ required: true }) maxPlayers = 0
    @Input() review: null | number = null
}
