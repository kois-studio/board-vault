import { Component, Input, inject } from '@angular/core'
import { GameType } from '../../../../api/api.types'
import { DataService } from '../../../../core/services/data.service'

@Component({
    imports: [],
    selector: 'app-review-row',
    templateUrl: './review-row.component.html',
})
export class ReviewRowComponent {
    @Input({ required: true }) game!: GameType
    @Input({ required: true }) review!: number

    private readonly dataService = inject(DataService)
    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser

    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public hoverRating = 0

    public setReview(gameId: number, reviewValue: number) {
        const accountId = this.currentUser$()?.id
        if (accountId) {
            this.dataService.saveGameReview(accountId, gameId, reviewValue)
        }
    }
}
