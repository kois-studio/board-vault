import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Api } from '../../api/api'
import { GameReviewType } from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { TitleSubtitleComponent } from '../../components/ui/title-subtitle/title-subtitle.component'
import { DataService } from '../../core/services/data.service'

@Component({
    standalone: true,
    imports: [CommonModule, TitleSubtitleComponent, ContainerWrapperComponent],
    templateUrl: 'history.component.html',
})
export class HistoryComponent {
    public loaded = false

    // DataService data (filled on init -> effect)
    public userData: ReturnType<typeof this.dataService.currentUser> = null

    // Component state
    public gamesHistory: Array<GameReviewType> = []

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
                },
                error: () => {
                    this.toastService.error('Error fetching user history')
                },
            })

            this.loaded = true
        })
    }
}
