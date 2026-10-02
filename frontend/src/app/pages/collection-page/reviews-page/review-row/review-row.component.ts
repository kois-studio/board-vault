import { Component, inject, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { GameCompleteType } from '../../../../api/api.types'
import { IconComponent } from '../../../../components/ui/icon/icon.component'
import { ImageBackgroundComponent } from '../../../../components/ui/image-background/image-background.component'
import { DataService } from '../../../../core/services/data.service'

@Component({
    imports: [RouterLink, IconComponent, ImageBackgroundComponent],
    selector: 'app-review-row',
    templateUrl: './review-row.component.html',
})
export class ReviewRowComponent {
    readonly game = input.required<GameCompleteType>()
    readonly review = input.required<number>()

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
