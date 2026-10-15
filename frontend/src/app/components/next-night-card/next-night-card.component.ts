import { NgTemplateOutlet } from '@angular/common'
import { Component, computed, effect, inject, input, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { AccountMeetType, GameCompleteType } from '../../api/api.types'
import { type NightSummary, summariseNight } from '../../core/utils/nightSummary'
import { relativeDay, sessionDateParts, upcomingState } from '../../core/utils/sessionTiming'
import { SessionAnswerComponent } from '../session-answer/session-answer.component'
import { ButtonComponent } from '../ui/button/button.component'

const COVERS_SHOWN = 3

/**
 * The first thing on Home once you have a group: your next game night, who is coming, what the group
 * leans towards, and your answer. Counts and the shortlist come from the night itself, read once per change.
 */
@Component({
    imports: [ButtonComponent, NgTemplateOutlet, RouterLink, SessionAnswerComponent],
    selector: 'app-next-night-card',
    templateUrl: 'next-night-card.component.html',
})
export class NextNightCardComponent {
    private readonly api = inject(Api)

    readonly night = input.required<AccountMeetType>()
    readonly groupName = input.required<string>()
    /** Games of the night's group, to show the shortlist. */
    readonly games = input.required<ReadonlyMap<number, GameCompleteType>>()
    /** "Azul, Wingspan", or empty. */
    readonly bringing = input('')

    readonly summary = signal<NightSummary | null>(null)

    constructor() {
        // Answering here refreshes the night list, which hands in a new night: read it again for fresh counts.
        effect(() => {
            const id = this.night().id
            void this.load(id)
        })
    }

    private async load(id: number): Promise<void> {
        try {
            const details = await firstValueFrom(this.api.getSessionDetailsById(id))
            if (this.night().id === id) this.summary.set(summariseNight(details))
        } catch {
            // The card stands without the counts; the night page has them.
            if (this.night().id === id) this.summary.set(null)
        }
    }

    readonly isLive = computed(() => upcomingState(this.night()) === 'live')
    readonly when = computed(() => {
        const parts = sessionDateParts(this.night())
        return `${parts.weekday} ${parts.day} ${parts.month} · ${parts.time}`
    })
    readonly relative = computed(() => relativeDay(this.night().meetDate))

    readonly covers = computed(() =>
        (this.summary()?.shortlist ?? [])
            .map(({ gameId }) => this.games().get(gameId))
            .filter((game): game is GameCompleteType => game !== undefined)
            .slice(0, COVERS_SHOWN)
            .map((game) => ({ id: game.id, title: game.titleTranslations.en || game.title || 'Untitled', imageUrl: game.imageUrl })),
    )

    /** "Azul leads with 3 votes" when one game is ahead, otherwise how many are shortlisted. */
    readonly shortlistLine = computed(() => {
        const shortlist = this.summary()?.shortlist ?? []
        if (shortlist.length === 0) return null
        const [first, second] = shortlist
        const leader = first && first.votes > 0 && (!second || second.votes < first.votes) ? this.games().get(first.gameId) : undefined
        if (leader && first) {
            return `${leader.titleTranslations.en || leader.title || 'A game'} leads with ${first.votes} vote${first.votes === 1 ? '' : 's'}`
        }
        return `${shortlist.length} game${shortlist.length === 1 ? '' : 's'} on the shortlist`
    })

    public hideBrokenImage(event: Event): void {
        const image = event.target
        if (image instanceof HTMLImageElement) image.hidden = true
    }
}
