import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { UserType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'

@Component({
    standalone: true,
    imports: [CommonModule],
    templateUrl: 'reviews.component.html',
})
export class ReviewComponent {
    public userGames: ReturnType<typeof this.dataService.userGames> = []
    public userReviews: ReturnType<typeof this.dataService.userReviews> = []
    public userData: UserType | null = null

    constructor(private readonly dataService: DataService) {
        effect(() => {
            this.userGames = this.dataService.userGames()
            this.userReviews = this.dataService.userReviews()
            this.userData = this.dataService.currentUser()
        })
    }

    public getReview(gameId: number): number {
        return this.userReviews.find((review) => review.gameId === gameId)?.review ?? -1
    }

    public setReview(gameId: number, reviewValue: number) {
        const accountId = this.userData?.id
        if (accountId) {
            if (this.getReview(gameId) === -1) {
                this.dataService.createGameReview(accountId, gameId, reviewValue)
            } else {
                this.dataService.updateGameReview(accountId, gameId, reviewValue)
            }
        }
    }

    public deleteReview(gameId: number) {
        const accountId = this.userData?.id
        if (accountId) {
            this.dataService.deleteGameReview(accountId, gameId)
        }
    }

    // public saveSelection() {
    //     this.dataService.updategamereview(this.userGamesIds, this.a)
    //     this.gameIdsToReview = []
    // }
}
