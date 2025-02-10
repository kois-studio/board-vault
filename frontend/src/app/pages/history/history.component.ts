import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Api } from '../../api/api'
import { GamePlayHistoryType } from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { TitleSubtitleComponent } from '../../components/ui/title-subtitle/title-subtitle.component'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'

@Component({
    standalone: true,
    imports: [CommonModule, TitleSubtitleComponent, ContainerWrapperComponent, CustomDatePipe],
    templateUrl: 'history.component.html',
})
export class HistoryComponent {
    public loaded = false

    // DataService data (filled on init -> effect)
    public userData: ReturnType<typeof this.dataService.currentUser> = null

    // Component state
    public gamesHistory: Array<GamePlayHistoryType> = []
    public groupedGames: Record<string, Array<GamePlayHistoryType>> = {}

    constructor(
        private readonly api: Api,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly dataService: DataService,
        private readonly toastService: ToastService,
    ) {
        effect(async () => {
            this.userData = this.dataService.currentUser()
            // this.userHistory

            if (!this.userData) {
                return
            }

            // Fetch user history
            this.api.getUserGamesHistory(this.userData.id).subscribe({
                next: (res) => {
                    this.gamesHistory = res
                    this.groupedGames = this._groupGamesByDate(res)
                },
                error: () => {
                    this.toastService.error('Error fetching user history')
                },
            })

            this.loaded = true
        })
    }

    private _groupGamesByDate(games: Array<GamePlayHistoryType>): Record<string, Array<GamePlayHistoryType>> {
        return games.reduce(
            (groups, game) => {
                const date = new Date(game.meetData.meetDate).toLocaleDateString()
                if (!groups[date]) {
                    groups[date] = []
                }
                groups[date].push(game)
                return groups
            },
            {} as Record<string, Array<GamePlayHistoryType>>,
        )
    }
}
