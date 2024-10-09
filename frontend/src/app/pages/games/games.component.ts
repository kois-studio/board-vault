import { Component, effect } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { Api } from '../../api/api'
import { GameCardComponent } from '../../components/game-card/game-card.component'
import { DataService } from '../../core/services/data.service'

@Component({
    standalone: true,
    imports: [GameCardComponent, ReactiveFormsModule],
    selector: 'app-games',
    templateUrl: 'games.component.html',
})
export class GamesComponent {
    public gamesList: ReturnType<typeof this.dataService.gamesList> = []
    public userGames: ReturnType<typeof this.dataService.userGames> = []
    public gameTitleForm = new FormControl('')

    constructor(
        private readonly api: Api,
        private readonly dataService: DataService,
    ) {
        effect(() => {
            this.gamesList = this.dataService.gamesList()
            this.userGames = this.dataService.userGames()

            if (this.gamesList.length === 0) {
                // TODO: handle in dataService
                this.api.getGames().subscribe((games) => {
                    this.dataService.gamesList.set(games)
                })
            }
        })
    }

    get gameTitle() {
        return this.gameTitleForm.get('title')
    }

    public onClickGame(gameId: number) {
        console.log('Clicked game:', gameId)
    }

    public onRequestNewGame() {
        console.log('Requesting new game')
    }
}
