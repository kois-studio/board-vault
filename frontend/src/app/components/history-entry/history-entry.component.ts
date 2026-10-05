import { Component, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { UserType } from '../../api/api.types'
import { ImageProfileComponent } from '../image-profile/image-profile.component'
import { IconComponent } from '../ui/icon/icon.component'

export type HistoryEntryView = {
    id: string
    /** The group's name. */
    title: string
    /** "2 October 2026 at 12:00". */
    dateLabel: string
    weekday: string
    day: string
    /** Router link to the session; null renders no Open link. */
    link: Array<string | number> | null
    attendees: Array<{ key: string; name: string; avatar: UserType['avatar'] | null }>
    /** "With Ana, Leo and 3 more". */
    attendeeSummary: string
    notes: string | null
    games: Array<{
        key: string
        title: string
        initials: string
        imageUrl: string | null
        link: Array<string | number> | null
        /** "Ana won", or empty when no winner was recorded. */
        winners: string
        /** "Ana and Leo", or null when players were not recorded. */
        playedBy: string | null
        /** Every attendee played: the card says so, and keeps the names for the tooltip and screen readers. */
        everyonePlayed: boolean
    }>
}

/** One recorded game night: who came, what they played, who won. The history page and the landing example render it. */
@Component({
    selector: 'app-history-entry',
    imports: [RouterLink, ImageProfileComponent, IconComponent],
    templateUrl: './history-entry.component.html',
})
export class HistoryEntryComponent {
    readonly entry = input.required<HistoryEntryView>()

    public hideBrokenImage(event: Event): void {
        const image = event.target
        if (image instanceof HTMLImageElement) image.hidden = true
    }
}
