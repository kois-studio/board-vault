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
    public allGames: ReturnType<typeof this.dataService.gamesList> = []
    public allGamesIds: Array<number> = []

    public userGames: ReturnType<typeof this.dataService.userGames> = []
    public userGamesIds: Array<number> = []

    // here we stor the GameType.id of the games that the user wants to toggle
    public gameIdsToToggle: Array<number> = []

    // the title of the game that the user wants to create
    public gameTitleForm = new FormControl('')

    constructor(
        private readonly api: Api,
        private readonly dataService: DataService,
    ) {
        effect(() => {
            this.allGames = this.dataService.gamesList()
            this.allGamesIds = this.allGames.map((game) => game.id)
            this.userGames = this.dataService.userGames()
            this.userGamesIds = this.userGames.map((game) => game.id)

            if (this.allGames.length === 0) {
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
        if (this.gameIdsToToggle.includes(gameId)) {
            this.gameIdsToToggle = this.gameIdsToToggle.filter((id) => id !== gameId)
        } else {
            this.gameIdsToToggle.push(gameId)
        }
    }

    public onRequestNewGame() {
        console.log('Requesting new game')
    }
}
