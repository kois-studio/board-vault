import { Component, effect } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { Api } from '../../../api/api'
import { CardGameComponent } from '../../../components/card-game/card-game.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { TitleSubtitleComponent } from '../../../components/ui/title-subtitle/title-subtitle.component'
import { DataService } from '../../../core/services/data.service'

@Component({
    imports: [CardGameComponent, ReactiveFormsModule, ContainerWrapperComponent, TitleSubtitleComponent, RouterLink],
    templateUrl: 'my-games-page.component.html',
})
export class MyGamesPageComponent {
    public loaded = false
    public activeTab: 'collection' | 'browse' = 'collection'
    //TODO: esto no se usa
    public allGamesIds: Array<number> = []

    public userGames: ReturnType<typeof this.dataService.userGames> = []
    public userGamesIds: Array<number> = []

    // here we stor the GameType.id of the games that the user wants to toggle
    public gameIdsToToggle: Array<number> = []

    constructor(
        private readonly api: Api,
        private readonly dataService: DataService,
    ) {
        effect(() => {
            this.userGames = this.dataService.userGames()
            this.userGamesIds = this.userGames.map((game) => game.id)
        })
    }

    public onClickGame(gameId: number) {
        if (this.gameIdsToToggle.includes(gameId)) {
            this.gameIdsToToggle = this.gameIdsToToggle.filter((id) => id !== gameId)
        } else {
            this.gameIdsToToggle.push(gameId)
        }
    }

    public saveSelection() {
        this.dataService.updateUserGames(this.userGamesIds, this.gameIdsToToggle)
        this.gameIdsToToggle = []
    }

    public onRequestNewGame() {
        console.log('Requesting new game')
    }
}
