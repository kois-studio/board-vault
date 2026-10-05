import { Component, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { BadgeComponent } from '../ui/badge/badge.component'
import { IconComponent } from '../ui/icon/icon.component'
import { ImageBackgroundComponent } from '../ui/image-background/image-background.component'

/** What the group thinks of a suggestion: Interested / Not for us votes. */
export type RecommendationGroupSignal = { interestedCount: number; interestedNames: string; notForUsCount: number }

/**
 * One suggested game and why it fits. Presentational: the Play page and the landing page's
 * example both render it. Actions (plan, votes) are projected below the reasons.
 */
@Component({
    selector: 'app-recommendation-card',
    imports: [RouterLink, BadgeComponent, IconComponent, ImageBackgroundComponent],
    templateUrl: './recommendation-card.component.html',
})
export class RecommendationCardComponent {
    readonly title = input.required<string>()
    readonly imageUrl = input.required<string>()
    /** Router link to the game; null renders the title as text. */
    readonly link = input<Array<string | number> | null>(null)
    readonly minutes = input.required<number>()
    readonly minPlayers = input.required<number>()
    readonly maxPlayers = input.required<number>()
    /** "Last played 2 October 2026" or "New to this group". */
    readonly historyLabel = input.required<string>()
    readonly reasons = input.required<Array<string>>()
    readonly score = input.required<number>()
    readonly isTopPick = input(false)
    readonly signal = input<RecommendationGroupSignal | null>(null)
}
