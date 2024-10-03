import { Component, OnInit } from '@angular/core';
import { GameType } from '../../types/game.type';
import { Api } from '../../api/api';
import { GameCardComponent } from '../../components/game-card/game-card.component';

@Component({
    standalone: true,
    imports: [GameCardComponent],
    selector: 'app-games',
    templateUrl: 'games.component.html',
})
export class GamesComponent implements OnInit {
    public gamesList: GameType[] = [];

    constructor(private readonly api: Api) {}

    ngOnInit() {
        this.api.getGames().subscribe((games) => {
            this.gamesList = games;
        });
    }
}
