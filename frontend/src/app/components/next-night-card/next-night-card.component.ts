import { NgTemplateOutlet } from '@angular/common'
import { Component, computed, effect, inject, input, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { AccountMeetType, GameCompleteType } from '../../api/api.types'
import { intlLocale } from '../../core/i18n/format'
import { gameTitle } from '../../core/utils/gameTitle'
import { type NightSummary, summariseNight } from '../../core/utils/nightSummary'
import { relativeDay, sessionDate, upcomingState } from '../../core/utils/sessionTiming'
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
    /** "Sat 24 Oct · 19:30" in the night's own timezone. */
    readonly when = computed(() => {
        const day = sessionDate(this.night(), { weekday: 'short', day: 'numeric', month: 'short' })
        return `${day} · ${sessionDate(this.night(), { hour: '2-digit', minute: '2-digit', hour12: false })}`
    })
    readonly relative = computed(() => relativeDay(this.night().meetDate))

    readonly covers = computed(() =>
        (this.summary()?.shortlist ?? [])
            .map(({ gameId }) => this.games().get(gameId))
            .filter((game): game is GameCompleteType => game !== undefined)
            .slice(0, COVERS_SHOWN)
            .map((game) => ({ id: game.id, title: gameTitle(game), imageUrl: game.imageUrl })),
    )

    /** "Azul leads with 3 votes" when one game is ahead, otherwise how many are shortlisted. */
    readonly shortlistLine = computed(() => {
        const shortlist = this.summary()?.shortlist ?? []
        if (shortlist.length === 0) return null
        const [first, second] = shortlist
        const leader = first && first.votes > 0 && (!second || second.votes < first.votes) ? this.games().get(first.gameId) : undefined
        const plural = new Intl.PluralRules(intlLocale())
        if (leader && first) {
            const title = gameTitle(leader)
            const votes = first.votes
            return plural.select(votes) === 'one'
                ? $localize`:On the game night card on Home, the shortlisted game with the most votes, one vote:${title}:title: leads with ${votes}:votes: vote`
                : $localize`:On the game night card on Home, the shortlisted game with the most votes, several votes:${title}:title: leads with ${votes}:votes: votes`
        }
        const count = shortlist.length
        return plural.select(count) === 'one'
            ? $localize`:On the game night card on Home, how many games are shortlisted, one:${count}:count: game on the shortlist`
            : $localize`:On the game night card on Home, how many games are shortlisted, several:${count}:count: games on the shortlist`
    })

    public hideBrokenImage(event: Event): void {
        const image = event.target
        if (image instanceof HTMLImageElement) image.hidden = true
    }
}
