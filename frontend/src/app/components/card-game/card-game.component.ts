import { Component, Input } from '@angular/core'
import { IconComponent } from '../ui/icon/icon.component'
import { ImageBackgroundComponent } from '../ui/image-background/image-background.component'
import { ReviewDisplayComponent } from '../ui/review-display/review-display.component'

@Component({
    imports: [ReviewDisplayComponent, ImageBackgroundComponent, IconComponent],
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
