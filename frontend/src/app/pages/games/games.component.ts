import { Component, effect } from '@angular/core'
import { Api } from '../../api/api'
import { DataService } from '../../core/services/data.service'
import { GameCardComponent } from '../../components/game-card/game-card.component'

@Component({
    standalone: true,
    imports: [GameCardComponent],
    selector: 'app-games',
    templateUrl: 'games.component.html',
})
export class GamesComponent {
    public gamesList: ReturnType<typeof this.dataService.gamesList> = []

    constructor(
        private readonly api: Api,
        private readonly dataService: DataService,
    ) {
        effect(() => {
            this.gamesList = this.dataService.gamesList()

            if (this.gamesList.length === 0) {
                this.api.getGames().subscribe((games) => {
                    this.dataService.gamesList.set(games)
                })
            }
        })
    }
}
