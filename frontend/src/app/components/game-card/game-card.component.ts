import { Component, Input } from '@angular/core';

@Component({
    standalone: true,
    imports: [],
    selector: 'app-game-card',
    templateUrl: 'game-card.component.html',
})
export class GameCardComponent {
    @Input({ required: true }) title = '';
    @Input({ required: true }) imageUrl = '';
    @Input({ required: true }) gameAvgDuration = 0;
    @Input({ required: true }) minPlayers = 0;
    @Input({ required: true }) maxPlayers = 0;
}
